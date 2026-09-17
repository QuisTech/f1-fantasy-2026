import type { Driver, Constructor, Circuit, UserLineup } from '../types/f1';
import { optimizeLineup } from './optimizer';
import { getNormalizedEliteConsensus, getDriverEffectiveXP, getConstructorEffectiveXP } from './eliteConsensus';

export interface QuantProjection {
  driverXP: Record<string, number>;
  constructorXP: Record<string, number>;
  circuit: Circuit;
  confidenceInterval: [number, number]; // 10th and 90th percentile total points
}

/**
 * Runs a 1,000-iteration Monte Carlo simulation for a specific circuit
 * to calculate risk-adjusted expected points factoring in weather, chaos, and tire wear.
 */
export function runMonteCarloSimulation(
  circuit: Circuit,
  drivers: Driver[],
  constructors: Constructor[]
): QuantProjection {
  const NUM_SIMULATIONS = 1000;
  
  const projectedDriverXP: Record<string, number[]> = {};
  const projectedConstructorXP: Record<string, number[]> = {};
  
  drivers.forEach(d => projectedDriverXP[d.id] = []);
  constructors.forEach(c => projectedConstructorXP[c.id] = []);

  let totalSimPoints: number[] = [];

  for (let i = 0; i < NUM_SIMULATIONS; i++) {
    // Roll the dice for this specific race scenario
    const isRain = Math.random() * 100 < (circuit.rainProbability ?? 15);
    const isSafetyCar = Math.random() * 100 < circuit.scProbability;
    
    let simTotal = 0;

    // Simulate Drivers
    drivers.forEach(d => {
      let simXP = d.xP;
      const wetSkill = d.wetWeatherSkill ?? 75;
      const tireSkill = d.tireManagement ?? 75;
      
      // 1. Weather impact
      if (isRain) {
        // High wet skill drivers excel in chaos, low skill drivers lose points (spin/DNF)
        const wetModifier = (wetSkill - 70) / 30; // -1.0 to 1.0
        simXP += wetModifier * 5.0; // +/- 5 points swing
        
        // Rain increases DNF variance
        if (Math.random() < 0.15 && wetSkill < 60) {
          simXP -= 15; // Crash in rain
        }
      }

      // 2. Tire Degradation impact
      if (circuit.tireDegradation === 'High' || circuit.tireDegradation === 'Extreme') {
        const tireModifier = (tireSkill - 70) / 30;
        simXP += tireModifier * 3.0; // Tire whispers gain late race pace
      }

      // 3. Chaos / Safety Car
      if (isSafetyCar) {
        // High overtake potential drivers capitalize on safety car restarts
        simXP += (d.orp * 0.5);
      }

      // 4. Active Aero Suitability
      if (circuit.activeAeroBenefit === 'X-Mode Straights' && d.teamId === 'williams') simXP += 2.0;
      if (circuit.activeAeroBenefit === 'X-Mode Straights' && d.teamId === 'ferrari') simXP += 2.0;
      if (circuit.activeAeroBenefit === 'Z-Mode Corners' && d.teamId === 'mclaren') simXP += 2.0;
      if (circuit.activeAeroBenefit === 'Z-Mode Corners' && d.teamId === 'red_bull') simXP += 2.0;

      // Floor at -20 (worst possible F1 Fantasy score)
      simXP = Math.max(-20, simXP);
      
      projectedDriverXP[d.id].push(simXP);
      simTotal += simXP;
    });

    // Simulate Constructors
    constructors.forEach(c => {
      let simXP = c.xP;
      if (isRain) simXP += (Math.random() * 6) - 3; // Teams with good pitwalls handle rain better, random variance
      if (isSafetyCar) simXP += 2; // Double stack successful pit stops
      projectedConstructorXP[c.id].push(simXP);
      simTotal += simXP;
    });

    totalSimPoints.push(simTotal);
  }

  // Aggregate risk-adjusted means (Expected Value)
  const riskAdjustedDriverXP: Record<string, number> = {};
  const riskAdjustedConstructorXP: Record<string, number> = {};

  drivers.forEach(d => {
    const sum = projectedDriverXP[d.id].reduce((acc, val) => acc + val, 0);
    riskAdjustedDriverXP[d.id] = Number((sum / NUM_SIMULATIONS).toFixed(1));
  });

  constructors.forEach(c => {
    const sum = projectedConstructorXP[c.id].reduce((acc, val) => acc + val, 0);
    riskAdjustedConstructorXP[c.id] = Number((sum / NUM_SIMULATIONS).toFixed(1));
  });

  // Calculate 10th and 90th percentile for the confidence interval
  totalSimPoints.sort((a, b) => a - b);
  const p10 = totalSimPoints[Math.floor(NUM_SIMULATIONS * 0.1)];
  const p90 = totalSimPoints[Math.floor(NUM_SIMULATIONS * 0.9)];

  return {
    driverXP: riskAdjustedDriverXP,
    constructorXP: riskAdjustedConstructorXP,
    circuit,
    confidenceInterval: [Number(p10.toFixed(0)), Number(p90.toFixed(0))]
  };
}


// --- BEAM SEARCH ALGORITHM ---

export interface GameweekState {
  driverIds: string[];
  constructorIds: string[];
  bankBudget: number;
  drsBoostDriverId: string;
  transfersUsedTotal: number;
  transferPenaltiesTotal: number;
  cumulativeXP: number;
  pathHistory: string[]; // Record of actions taken
}

function getLineupCost(driverIds: string[], constructorIds: string[], drivers: Driver[], constructors: Constructor[]): number {
  let cost = 0;
  driverIds.forEach(id => cost += drivers.find(d => d.id === id)?.price || 0);
  constructorIds.forEach(id => cost += constructors.find(c => c.id === id)?.price || 0);
  return Number(cost.toFixed(1));
}

function calculateLineupXP(
  driverIds: string[],
  constructorIds: string[],
  drsId: string,
  projection: QuantProjection,
  strategyMode: 'safe' | 'aggressive' | 'value' = 'safe',
  drivers: Driver[] = [],
  constructors: Constructor[] = []
): number {
  let xp = 0;
  const consensus = strategyMode === 'value' ? getNormalizedEliteConsensus(true) : undefined;

  driverIds.forEach(id => {
    let base = projection.driverXP[id] || 0;
    const dObj = drivers.find(d => d.id === id);
    if (dObj && strategyMode === 'value') {
      base = getDriverEffectiveXP({ ...dObj, xP: base }, strategyMode, consensus);
    }
    xp += (id === drsId) ? base * 2 : base;
  });

  constructorIds.forEach(id => {
    let base = projection.constructorXP[id] || 0;
    const cObj = constructors.find(c => c.id === id);
    if (cObj && strategyMode === 'value') {
      base = getConstructorEffectiveXP({ ...cObj, xP: base }, strategyMode, consensus);
    }
    xp += base;
  });

  return Number(xp.toFixed(1));
}

function generateNextStates(
  currentState: GameweekState,
  projection: QuantProjection,
  drivers: Driver[],
  constructors: Constructor[],
  gwIndex: number,
  lockedDriverIds: string[],
  excludedDriverIds: string[],
  strategyMode: 'safe' | 'aggressive' | 'value' = 'safe'
): GameweekState[] {
  const nextStates: GameweekState[] = [];
  const maxBudget = currentState.bankBudget + getLineupCost(currentState.driverIds, currentState.constructorIds, drivers, constructors);

  // Helper to score and push a state
  const pushState = (newDriverIds: string[], newConstructorIds: string[], actionDesc: string, penalty: number, isWildcard: boolean = false) => {
    for (const id of newDriverIds) {
      if (excludedDriverIds.includes(id)) return;
    }
    for (const lockedId of lockedDriverIds) {
      if (!newDriverIds.includes(lockedId)) return;
    }
    const cost = getLineupCost(newDriverIds, newConstructorIds, drivers, constructors);
    if (cost <= maxBudget) {
      // Auto-assign DRS to highest projected xP driver (or consensus captain in Value Mode)
      const consensus = strategyMode === 'value' ? getNormalizedEliteConsensus(true) : undefined;
      let bestDrs = newDriverIds[0];
      if (strategyMode === 'value' && consensus?.topCaptainId && newDriverIds.includes(consensus.topCaptainId)) {
        bestDrs = consensus.topCaptainId;
      } else {
        let maxXP = -999;
        newDriverIds.forEach(id => {
          if ((projection.driverXP[id] || 0) > maxXP) {
            maxXP = projection.driverXP[id] || 0;
            bestDrs = id;
          }
        });
      }

      const weeklyXP = calculateLineupXP(newDriverIds, newConstructorIds, bestDrs, projection, strategyMode, drivers, constructors);
      
      nextStates.push({
        driverIds: newDriverIds,
        constructorIds: newConstructorIds,
        bankBudget: Number((maxBudget - cost).toFixed(1)),
        drsBoostDriverId: bestDrs,
        transfersUsedTotal: currentState.transfersUsedTotal + (isWildcard ? 0 : penalty > 0 ? 3 : 0), // simplifies tracking
        transferPenaltiesTotal: currentState.transferPenaltiesTotal + penalty,
        cumulativeXP: currentState.cumulativeXP + weeklyXP - penalty,
        pathHistory: [...currentState.pathHistory, `GW${gwIndex + 1} (${projection.circuit.id}): ${actionDesc} (Expected: ${weeklyXP.toFixed(1)} xP)`]
      });
    }
  };

  // 1. Do Nothing (0 transfers)
  pushState(currentState.driverIds, currentState.constructorIds, 'Hold Lineup', 0);

  // 2. Explore 1-Transfer paths (Drivers)
  for (let i = 0; i < currentState.driverIds.length; i++) {
    const currentD = currentState.driverIds[i];
    const currentName = drivers.find(d => d.id === currentD)?.shortName;
    for (const d of drivers) {
      if (!currentState.driverIds.includes(d.id)) {
        const newDrivers = [...currentState.driverIds];
        newDrivers[i] = d.id;
        pushState(newDrivers, currentState.constructorIds, `OUT ${currentName}, IN ${d.shortName}`, 0);
      }
    }
  }

  // 3. Explore 1-Transfer paths (Constructors)
  for (let i = 0; i < currentState.constructorIds.length; i++) {
    const currentC = currentState.constructorIds[i];
    const currentName = constructors.find(c => c.id === currentC)?.shortName;
    for (const c of constructors) {
      if (!currentState.constructorIds.includes(c.id)) {
        const newConstructors = [...currentState.constructorIds];
        newConstructors[i] = c.id;
        pushState(currentState.driverIds, newConstructors, `OUT ${currentName}, IN ${c.shortName}`, 0);
      }
    }
  }

  // For Wildcard, inject the mode-aware Optimizer result
  const wcResult = optimizeLineup(drivers, constructors, maxBudget, lockedDriverIds, excludedDriverIds, strategyMode);
  if (wcResult) {
    const wcDriverIds = wcResult.drivers.map(d => d.id);
    const wcConstructorIds = wcResult.constructors.map(c => c.id);
    pushState(wcDriverIds, wcConstructorIds, `PLAY WILDCARD CHIP -> Optimized Lineup`, 0, true);
  }

  return nextStates;
}

export function beamSearchMultiWeek(
  initialLineup: UserLineup,
  drivers: Driver[],
  constructors: Constructor[],
  upcomingCircuits: Circuit[],
  beamWidth: number = 10,
  lockedDriverIds: string[] = [],
  excludedDriverIds: string[] = [],
  strategyMode: 'safe' | 'aggressive' | 'value' = 'safe'
): GameweekState {
  
  // Initialize beam with start state
  let currentBeam: GameweekState[] = [{
    driverIds: [...initialLineup.driverIds],
    constructorIds: [...initialLineup.constructorIds],
    bankBudget: initialLineup.bankBudget,
    drsBoostDriverId: initialLineup.drsBoostDriverId,
    transfersUsedTotal: 0,
    transferPenaltiesTotal: 0,
    cumulativeXP: 0,
    pathHistory: []
  }];

  // Iterate over each upcoming gameweek
  for (let gw = 0; gw < upcomingCircuits.length; gw++) {
    const circuit = upcomingCircuits[gw];
    const projection = runMonteCarloSimulation(circuit, drivers, constructors);
    
    let nextBeam: GameweekState[] = [];

    for (const state of currentBeam) {
      const expandedStates = generateNextStates(state, projection, drivers, constructors, gw, lockedDriverIds, excludedDriverIds, strategyMode);
      nextBeam = nextBeam.concat(expandedStates);
    }

    // Sort by cumulative XP minus penalties and slice top K (Beam Width)
    // To ensure diversity, we should technically group by state hash, but simple sort works for MVP
    nextBeam.sort((a, b) => b.cumulativeXP - a.cumulativeXP);
    
    // Deduplicate identical rosters in the beam
    const uniqueBeam: GameweekState[] = [];
    const seenHashes = new Set<string>();
    
    for (const state of nextBeam) {
      const hash = [...state.driverIds].sort().join(',') + '|' + [...state.constructorIds].sort().join(',');
      if (!seenHashes.has(hash)) {
        seenHashes.add(hash);
        uniqueBeam.push(state);
      }
      if (uniqueBeam.length >= beamWidth) break;
    }

    currentBeam = uniqueBeam;
  }

  // Return the best path found
  return currentBeam[0];
}

import eliteCohortData from '../data/eliteCohort.json';
import type { Driver, Constructor } from '../types/f1';

export interface EliteConsensusData {
  cohortSize: number;
  totalCohortSize: number;
  chipBreakdown: Record<string, number>;
  driverEO: Record<string, number>; // id -> percentage (0 to 100)
  constructorEO: Record<string, number>; // id -> percentage (0 to 100)
  captainVotes: Record<string, number>; // id -> vote percentage (0 to 100)
  topCaptainId: string;
}

export const F1_RAW_CONSTRUCTOR_ID_MAP: Record<string, string> = {
  '28': 'mercedes',
  '29': 'red_bull',
  '27': 'mclaren',
  '25': 'ferrari',
  '23': 'alpine',
  '2636': 'racing_bulls',
  '26': 'haas',
  '2640': 'audi',
  '210': 'williams',
  '2641': 'cadillac',
  '24': 'aston_martin',
};

/**
 * Normalizes the elite manager cohort by filtering out non-budget constrained chips (e.g. Limitless)
 * so that Starting Weapons and Budget Enablers reflect true $100M cost-cap reality.
 */
export function getNormalizedEliteConsensus(excludeLimitless: boolean = true): EliteConsensusData {
  const cohort = eliteCohortData as any[];
  const chipBreakdown: Record<string, number> = {};

  cohort.forEach((m) => {
    const chip = m.activeChip || 'none';
    chipBreakdown[chip] = (chipBreakdown[chip] || 0) + 1;
  });

  // Limitless chip gives infinite budget for that week; normalize by excluding them from cost-cap analysis
  const filteredCohort = excludeLimitless
    ? cohort.filter((m) => m.activeChip !== 'limitless')
    : cohort;

  const cohortSize = filteredCohort.length;
  const ownershipMap: Record<string, number> = {};
  const captainVotesMap: Record<string, number> = {};

  filteredCohort.forEach((manager) => {
    (manager.drivers || []).forEach((d: any) => {
      const dId = String(d.id || d);
      ownershipMap[dId] = (ownershipMap[dId] || 0) + 1;
      // If constructor position, also register teamId
      if (d.playerpostion >= 6 && F1_RAW_CONSTRUCTOR_ID_MAP[dId]) {
        const teamId = F1_RAW_CONSTRUCTOR_ID_MAP[dId];
        ownershipMap[teamId] = (ownershipMap[teamId] || 0) + 1;
      }
    });
    if (manager.captainId) {
      const capId = String(manager.captainId);
      captainVotesMap[capId] = (captainVotesMap[capId] || 0) + 1;
    }
  });

  const driverEO: Record<string, number> = {};
  const constructorEO: Record<string, number> = {};
  const captainVotes: Record<string, number> = {};

  for (const [id, count] of Object.entries(ownershipMap)) {
    const pct = cohortSize > 0 ? (count / cohortSize) * 100 : 0;
    driverEO[id] = pct;
    constructorEO[id] = pct;
  }

  let topCaptainId = '11161';
  let maxCapVotes = -1;
  for (const [id, count] of Object.entries(captainVotesMap)) {
    const pct = cohortSize > 0 ? (count / cohortSize) * 100 : 0;
    captainVotes[id] = pct;
    if (pct > maxCapVotes) {
      maxCapVotes = pct;
      topCaptainId = id;
    }
  }

  return {
    cohortSize,
    totalCohortSize: cohort.length,
    chipBreakdown,
    driverEO,
    constructorEO,
    captainVotes,
    topCaptainId,
  };
}

/**
 * Calculates effective driver scoring for the LP Optimizer and Beam Search
 * depending on strategy mode (Safe vs Aggressive vs Value).
 */
export function getDriverEffectiveXP(
  d: Driver,
  strategyMode: 'safe' | 'aggressive' | 'value',
  consensus?: EliteConsensusData
): number {
  let eff = d.xP;
  
  if (strategyMode === 'aggressive') {
    // Aggressive chases overtake differentials & high ORP
    eff += (d.orp * 0.15);
  } else if (strategyMode === 'safe') {
    // Safe mode penalizes high variance ORP
    eff -= (d.orp * 0.05);
  } else if (strategyMode === 'value') {
    // Value Mode: Ingests real Elite Consensus Hub intelligence
    const cons = consensus || getNormalizedEliteConsensus(true);
    const eoPct = (cons.driverEO[d.id] || 0) / 100; // 0.0 to 1.0
    const ppm = d.xP / Math.max(d.price, 1); // Points per million efficiency

    // 1. Points-per-million value efficiency bonus
    const ppmBonus = ppm * 2.5;

    // 2. Elite Consensus weighting: starting weapons & proven budget enablers heavily weighted
    const consensusBonus = eoPct * 6.0;

    eff = eff + ppmBonus + consensusBonus;
  }

  return eff;
}

/**
 * Calculates effective constructor scoring for the LP Optimizer and Beam Search
 */
export function getConstructorEffectiveXP(
  c: Constructor,
  strategyMode: 'safe' | 'aggressive' | 'value',
  consensus?: EliteConsensusData
): number {
  let eff = c.xP;

  if (strategyMode === 'value') {
    const cons = consensus || getNormalizedEliteConsensus(true);
    const eoPct = (cons.constructorEO[c.id] || 0) / 100; // 0.0 to 1.0
    const ppm = c.xP / Math.max(c.price, 1);
    
    // Top constructor template alignment (e.g. Mercedes 99.8%, Ferrari 94.6%)
    eff = eff + (eoPct * 5.0) + (ppm * 2.0);
  }

  return eff;
}

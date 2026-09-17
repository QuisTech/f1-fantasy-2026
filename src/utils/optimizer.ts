import type { Driver, Constructor, UserLineup, FinalFixRecommendation } from '../types/f1';
import { getNormalizedEliteConsensus, getDriverEffectiveXP, getConstructorEffectiveXP } from './eliteConsensus';

export interface OptimizationResult {
  drivers: Driver[];
  constructors: Constructor[];
  drsBoostDriver: Driver;
  totalCost: number;
  totalXP: number;
  bankRemaining: number;
}

/**
 * Knapsack / LP solver to find optimal 5 Drivers + 2 Constructors team under maxBudget
 */
export function optimizeLineup(
  drivers: Driver[],
  constructors: Constructor[],
  maxBudget: number = 100.0,
  lockedDriverIds: string[] = [],
  excludedDriverIds: string[] = [],
  strategyMode: 'safe' | 'aggressive' | 'value' = 'safe'
): OptimizationResult | null {
  let bestResult: OptimizationResult | null = null;
  let maxScore = -1;
  const validDrivers = drivers.filter(d => !excludedDriverIds.includes(d.id));

  // Ingest normalized elite cohort intelligence
  const consensus = getNormalizedEliteConsensus(true);

  // Combination generator for 2 constructors out of 10
  for (let c1 = 0; c1 < constructors.length; c1++) {
    for (let c2 = c1 + 1; c2 < constructors.length; c2++) {
      const constrCombo = [constructors[c1], constructors[c2]];
      const constrCost = constrCombo[0].price + constrCombo[1].price;
      
      // Objective score for constructors
      const constrScore = getConstructorEffectiveXP(constructors[c1], strategyMode, consensus) +
                          getConstructorEffectiveXP(constructors[c2], strategyMode, consensus);

      if (constrCost > maxBudget) continue;

      const remainingDriverBudget = maxBudget - constrCost;

      // 5 drivers out of filtered drivers
      for (let d1 = 0; d1 < validDrivers.length; d1++) {
        for (let d2 = d1 + 1; d2 < validDrivers.length; d2++) {
          for (let d3 = d2 + 1; d3 < validDrivers.length; d3++) {
            for (let d4 = d3 + 1; d4 < validDrivers.length; d4++) {
              for (let d5 = d4 + 1; d5 < validDrivers.length; d5++) {
                const driverCombo = [
                  validDrivers[d1],
                  validDrivers[d2],
                  validDrivers[d3],
                  validDrivers[d4],
                  validDrivers[d5],
                ];
                
                // Enforce lock constraint
                if (lockedDriverIds.length > 0) {
                  let hasAllLocked = true;
                  for (const lockedId of lockedDriverIds) {
                    if (!driverCombo.find(d => d.id === lockedId)) {
                      hasAllLocked = false;
                      break;
                    }
                  }
                  if (!hasAllLocked) continue;
                }

                const driverCost = driverCombo.reduce((acc, d) => acc + d.price, 0);

                if (driverCost <= remainingDriverBudget) {
                  // Calculate objective function score per driver
                  const sortedByScore = [...driverCombo].sort(
                    (a, b) => getDriverEffectiveXP(b, strategyMode, consensus) - getDriverEffectiveXP(a, strategyMode, consensus)
                  );

                  // Captain selection: In Value Mode, prioritize consensus #1 captain if present
                  let drsDriver = sortedByScore[0];
                  if (strategyMode === 'value' && consensus.topCaptainId) {
                    const topCapInLineup = driverCombo.find(d => d.id === consensus.topCaptainId);
                    if (topCapInLineup) {
                      drsDriver = topCapInLineup;
                    }
                  }

                  const driverScore = driverCombo.reduce(
                    (acc, d) => acc + getDriverEffectiveXP(d, strategyMode, consensus), 0
                  ) + getDriverEffectiveXP(drsDriver, strategyMode, consensus);

                  const totalLineupScore = driverScore + constrScore;
                  const totalCost = constrCost + driverCost;

                  if (totalLineupScore > maxScore) {
                    maxScore = totalLineupScore;

                    // Real projected xP (unweighted) for user display
                    const realDriverXP = driverCombo.reduce((acc, d) => acc + d.xP, 0) + drsDriver.xP;
                    const realLineupXP = realDriverXP + constrCombo[0].xP + constrCombo[1].xP;

                    bestResult = {
                      drivers: driverCombo,
                      constructors: constrCombo,
                      drsBoostDriver: drsDriver,
                      totalCost: Number(totalCost.toFixed(1)),
                      totalXP: Number(realLineupXP.toFixed(1)),
                      bankRemaining: Number((maxBudget - totalCost).toFixed(1)),
                    };
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return bestResult;
}

/**
 * Calculates Post-Qualifying "Final Fix" driver swap recommendations
 */
export function calculateFinalFixRecommendations(
  userLineup: UserLineup,
  allDrivers: Driver[]
): FinalFixRecommendation[] {
  const currentDrivers = allDrivers.filter((d) => userLineup.driverIds.includes(d.id));
  const availableDrivers = allDrivers.filter((d) => !userLineup.driverIds.includes(d.id));
  
  const recommendations: FinalFixRecommendation[] = [];

  for (const current of currentDrivers) {
    const maxAffordablePrice = current.price + userLineup.bankBudget;

    for (const target of availableDrivers) {
      if (target.price <= maxAffordablePrice) {
        const xPGain = target.xP - current.xP;
        
        // Flag high value final fix swaps (starting out of position or high xP gain)
        if (xPGain > 3.0 || (target.gridPosition > 12 && target.orp > 10.0)) {
          let reason = '';
          let gridDelta = `Qualified P${target.gridPosition} (Expected finish P${target.expectedFinish})`;

          if (target.gridPosition > 14 && target.orp > 12.0) {
            reason = `High Overtake Recovery Potential! ${target.shortName} starting P${target.gridPosition} offers massive +2 pts/overtake bonus.`;
          } else if (target.gridPosition <= 3 && current.gridPosition > 8) {
            reason = `Front-row starting advantage! ${target.shortName} qualified P${target.gridPosition} securing early clean air points.`;
          } else {
            reason = `Statistically superior expected points (+${xPGain.toFixed(1)} xP gain) over ${current.shortName}.`;
          }

          recommendations.push({
            currentDriver: current,
            recommendedDriver: target,
            xPGain: Number(xPGain.toFixed(1)),
            reason,
            gridDeltaImpact: gridDelta,
          });
        }
      }
    }
  }

  // Sort by highest xP gain
  return recommendations.sort((a, b) => b.xPGain - a.xPGain);
}

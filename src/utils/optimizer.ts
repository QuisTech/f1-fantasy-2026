import type { Driver, Constructor, UserLineup, FinalFixRecommendation } from '../types/f1';

export interface OptimizationResult {
  drivers: Driver[];
  constructors: Constructor[];
  drsBoostDriver: Driver;
  totalCost: number;
  totalXP: number;
  bankRemaining: number;
}

/**
 * Knapsack solver to find optimal 5 Drivers + 2 Constructors team under maxBudget
 */
export function optimizeLineup(
  drivers: Driver[],
  constructors: Constructor[],
  maxBudget: number = 100.0,
  lockedDriverIds: string[] = [],
  excludedDriverIds: string[] = []
): OptimizationResult | null {
  let bestResult: OptimizationResult | null = null;
  let maxXP = -1;
  const validDrivers = drivers.filter(d => !excludedDriverIds.includes(d.id));

  // Combination generator for 2 constructors out of 10
  for (let c1 = 0; c1 < constructors.length; c1++) {
    for (let c2 = c1 + 1; c2 < constructors.length; c2++) {
      const constrCombo = [constructors[c1], constructors[c2]];
      const constrCost = constrCombo[0].price + constrCombo[1].price;
      const constrXP = constrCombo[0].xP + constrCombo[1].xP;

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
                  // Find driver with highest xP to assign 2x DRS Boost
                  const sortedByXP = [...driverCombo].sort((a, b) => b.xP - a.xP);
                  const drsDriver = sortedByXP[0];
                  
                  // Base xP + extra 1x for DRS Driver (making it 2x total)
                  const driverXP = driverCombo.reduce((acc, d) => acc + d.xP, 0) + drsDriver.xP;
                  const totalLineupXP = driverXP + constrXP;
                  const totalCost = constrCost + driverCost;

                  if (totalLineupXP > maxXP) {
                    maxXP = totalLineupXP;
                    bestResult = {
                      drivers: driverCombo,
                      constructors: constrCombo,
                      drsBoostDriver: drsDriver,
                      totalCost: Number(totalCost.toFixed(1)),
                      totalXP: Number(totalLineupXP.toFixed(1)),
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

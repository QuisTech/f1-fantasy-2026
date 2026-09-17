import historicalRoundsData from '../data/historicalRounds.json';
import type {
  RoundKey,
  HistoricalRoundData,
  HistoricalDriver,
  HistoricalConstructor,
  HistoricalManagerScore
} from '../types/f1';

export const AVAILABLE_ROUNDS: RoundKey[] = ['R14', 'R13', 'R12', 'R11', 'R10', 'R9'];

const dataMap = historicalRoundsData as Record<RoundKey, HistoricalRoundData>;

/**
 * Retrieve full data package for a specific round
 */
export function getHistoricalRound(roundKey: RoundKey): HistoricalRoundData {
  return dataMap[roundKey] || dataMap['R14'];
}

/**
 * Get round points scored by a driver in a specific round
 */
export function getDriverRoundPoints(driverId: string, roundKey: RoundKey): number {
  const round = getHistoricalRound(roundKey);
  const driver = round.drivers.find((d) => d.id === driverId);
  return driver ? driver.roundPoints : 0;
}

/**
 * Get full driver entity for a specific round
 */
export function getDriverRoundData(driverId: string, roundKey: RoundKey): HistoricalDriver | undefined {
  const round = getHistoricalRound(roundKey);
  return round.drivers.find((d) => d.id === driverId);
}

/**
 * Get round points scored by a constructor in a specific round
 */
export function getConstructorRoundPoints(constructorId: string, roundKey: RoundKey): number {
  const round = getHistoricalRound(roundKey);
  const c = round.constructors.find(
    (item) => item.id === constructorId || item.f1PlayerId === constructorId || item.shortName.toLowerCase() === constructorId.toLowerCase()
  );
  return c ? c.roundPoints : 0;
}

/**
 * Get full constructor entity for a specific round
 */
export function getConstructorRoundData(constructorId: string, roundKey: RoundKey): HistoricalConstructor | undefined {
  const round = getHistoricalRound(roundKey);
  return round.constructors.find(
    (item) => item.id === constructorId || item.f1PlayerId === constructorId || item.shortName.toLowerCase() === constructorId.toLowerCase()
  );
}

/**
 * Get Starting Weapons (high cost / premium conviction assets >= $15M) for a specific round
 */
export function getStartingWeaponsForRound(roundKey: RoundKey) {
  const round = getHistoricalRound(roundKey);
  const cohortSize = round.cohortScores.length || 501;

  // Premium Drivers
  const premiumDrivers = round.drivers
    .filter((d) => d.price >= 15.0)
    .map((d) => {
      const starts = Math.round((d.selectedPercentage / 100) * cohortSize);
      const startPct = Math.round(d.selectedPercentage);
      const capPct = Math.round(d.captainSelectedPercentage);
      const caps = Math.round((capPct / 100) * cohortSize);
      const conviction = (starts / cohortSize) + 0.5 * (caps / cohortSize);
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        teamName: d.teamName,
        role: 'DVR' as const,
        price: d.price,
        roundPoints: d.roundPoints,
        overallPoints: d.overallPoints,
        starts,
        startPct,
        caps,
        capPct,
        conviction,
      };
    });

  // Top Constructors
  const topConstructors = round.constructors
    .filter((c) => c.price >= 14.0)
    .map((c) => {
      const starts = Math.round((c.selectedPercentage / 100) * cohortSize);
      const startPct = Math.round(c.selectedPercentage);
      const conviction = starts / cohortSize;
      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        teamName: c.name,
        role: 'CON' as const,
        price: c.price,
        roundPoints: c.roundPoints,
        overallPoints: c.overallPoints,
        starts,
        startPct,
        caps: 0,
        capPct: 0,
        conviction,
      };
    });

  return [...premiumDrivers, ...topConstructors]
    .sort((a, b) => b.conviction - a.conviction)
    .slice(0, 7);
}

/**
 * Get Budget Enablers (value assets < $15M) for a specific round
 */
export function getBudgetEnablersForRound(roundKey: RoundKey) {
  const round = getHistoricalRound(roundKey);
  const cohortSize = round.cohortScores.length || 501;

  return round.drivers
    .filter((d) => d.price < 15.0)
    .map((d) => {
      const starts = Math.round((d.selectedPercentage / 100) * cohortSize);
      const selPct = Math.round(d.selectedPercentage);
      const conviction = (starts / cohortSize) * 0.5;
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        teamName: d.teamName,
        role: 'DVR' as const,
        price: d.price,
        roundPoints: d.roundPoints,
        overallPoints: d.overallPoints,
        selPct,
        starts,
        conviction,
      };
    })
    .sort((a, b) => b.selPct - a.selPct)
    .slice(0, 10);
}

/**
 * Get Top Captains ranking for a specific round
 */
export function getTopCaptainsForRound(roundKey: RoundKey) {
  const round = getHistoricalRound(roundKey);
  return round.drivers
    .filter((d) => d.captainSelectedPercentage > 0)
    .sort((a, b) => b.captainSelectedPercentage - a.captainSelectedPercentage)
    .map((d) => ({
      driver: d,
      percent: Math.round(d.captainSelectedPercentage),
      roundPoints: d.roundPoints,
    }));
}

/**
 * Get filtered cohort scores for a round
 */
export function getCohortForRound(
  roundKey: RoundKey,
  filter: 'all' | 'zero_chips' | 'normalized'
): HistoricalManagerScore[] {
  const round = getHistoricalRound(roundKey);
  if (filter === 'zero_chips') {
    return round.cohortScores.filter((m) => !m.activeChip || m.activeChip === 'none');
  }
  if (filter === 'normalized') {
    return round.cohortScores.filter((m) => m.activeChip !== 'limitless');
  }
  return round.cohortScores;
}

export interface RoundPerformance {
  roundKey: RoundKey;
  roundNumber: number;
  grandPrix: string;
  points: number;
  price: number;
  priceChange: number;
  selectedPercentage: number;
  captainSelectedPercentage: number;
  sessionWisePoints?: {
    qualifying: number;
    race: number;
    sprint: number;
  };
}

/**
 * Get round-by-round historical performance for a driver
 */
export function getDriverPointsHistory(driverId: string): RoundPerformance[] {
  return AVAILABLE_ROUNDS.slice().reverse().map((roundKey) => {
    const round = getHistoricalRound(roundKey);
    const d = round.drivers.find((x) => x.id === driverId || x.shortName.toLowerCase() === driverId.toLowerCase());
    return {
      roundKey,
      roundNumber: round.round,
      grandPrix: round.grandPrix,
      points: d ? d.roundPoints : 0,
      price: d ? d.price : 0,
      priceChange: d ? d.priceChange : 0,
      selectedPercentage: d ? d.selectedPercentage : 0,
      captainSelectedPercentage: d ? d.captainSelectedPercentage : 0,
      sessionWisePoints: d?.sessionWisePoints,
    };
  });
}

/**
 * Get round-by-round historical performance for a constructor
 */
export function getConstructorPointsHistory(constructorId: string): RoundPerformance[] {
  return AVAILABLE_ROUNDS.slice().reverse().map((roundKey) => {
    const round = getHistoricalRound(roundKey);
    const c = round.constructors.find(
      (x) => x.id === constructorId || x.f1PlayerId === constructorId || x.shortName.toLowerCase() === constructorId.toLowerCase()
    );
    return {
      roundKey,
      roundNumber: round.round,
      grandPrix: round.grandPrix,
      points: c ? c.roundPoints : 0,
      price: c ? c.price : 0,
      priceChange: c ? c.priceChange : 0,
      selectedPercentage: c ? c.selectedPercentage : 0,
      captainSelectedPercentage: c ? c.captainSelectedPercentage : 0,
      sessionWisePoints: c?.sessionWisePoints,
    };
  });
}


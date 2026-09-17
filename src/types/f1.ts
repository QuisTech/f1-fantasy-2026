export type TeamId = 
  | 'red_bull'
  | 'ferrari'
  | 'mclaren'
  | 'mercedes'
  | 'aston_martin'
  | 'rb'
  | 'haas'
  | 'alpine'
  | 'williams'
  | 'sauber'
  | 'racing_bulls'
  | 'audi'
  | 'cadillac';

export interface Driver {
  id: string;
  name: string;
  shortName: string; // e.g. VER, HAM, NOR
  number: number;
  teamId: TeamId;
  teamName: string;
  price: number; // in $M (e.g. 29.5)
  priceChange: number; // e.g. +0.2M price growth prediction
  projectedPoints: number; // Raw projected points from F1 API
  xP: number; // Expected Points for current race
  form: number; // Avg points over last 3 GPs
  gridPosition: number; // Starting grid (1 to 20)
  expectedFinish: number; // Projected race finish position
  orp: number; // Overtake & Recovery Potential (+2 pts / overtake)
  tdi: number; // Teammate Dominance Index (0 to 100)
  xDnf: number; // DNF probability percentage (0 to 100)
  ownership: number; // Effective ownership percentage
  drsOwnership: number; // DRS Boosted ownership %
  totalPoints: number;
  seasonRank: number;
  activeAeroEfficiency: number; // 2026 Active Aero score (0-100)
  manualOverrideBoost: boolean; // 2026 MOM electrical boost capability
  headToHeadVsTeammate: {
    qualiDeltaSeconds: number; // negative means faster than teammate
    racePaceDelta: number; // s/lap faster than teammate
    qualiWins: number;
    qualiLosses: number;
  };
  wetWeatherSkill?: number; // 0-100 rating in the wet (Monte Carlo use)
  tireManagement?: number; // 0-100 rating for long runs
}

export interface Constructor {
  id: TeamId;
  name: string;
  shortName: string;
  price: number; // in $M (e.g. 28.0)
  driver1Id: string;
  driver2Id: string;
  projectedPoints: number; // Raw projected points from F1 API
  xP: number; // Expected points for constructor
  avgPitStopSec: number; // Average pit stop time (e.g. 2.05s)
  xPitPoints: number; // Expected pit stop points (+10 pts fastest pit stop)
  ownership: number;
  totalPoints: number;
  color: string; // Hex color for team livery
  secondaryColor: string;
}

export interface Circuit {
  id: string;
  date?: string;
  name: string;
  grandPrixName: string;
  location: string;
  countryCode: string;
  laps: number;
  lengthKm: number;
  overtakeDifficulty: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';
  scProbability: number; // Percentage e.g. 85%
  pitLaneDeltaSec: number; // Time lost in pit stop e.g. 20.4s
  tireDegradation: 'Low' | 'Medium' | 'High' | 'Extreme';
  activeAeroBenefit: 'X-Mode Straights' | 'Z-Mode Corners' | 'Balanced';
  rainProbability?: number; // Historical percentage e.g. 45%
}

export type ChipType = 
  | 'final_fix'
  | 'drs_3x'
  | 'autopilot'
  | 'no_negative'
  | 'wildcard'
  | 'extra_drs';

export interface ChipStatus {
  type: ChipType;
  name: string;
  description: string;
  isAvailable: boolean;
}

export interface UserLineup {
  driverIds: string[]; // 5 drivers
  constructorIds: TeamId[]; // 2 constructors
  drsBoostDriverId: string; // Driver with 2x DRS Boost
  activeChip: ChipType | null;
  freeTransfers: number;
  bankBudget: number; // Remaining budget ($M)
  totalCost: number; // Current lineup cost ($M)
  teamValue: number; // Total team value ($M) - Target $115M for World #1
  totalExpectedPoints: number;
}

export interface FinalFixRecommendation {
  currentDriver: Driver;
  recommendedDriver: Driver;
  xPGain: number;
  reason: string;
  gridDeltaImpact: string;
}

export interface MiniLeagueRival {
  id: string;
  managerName: string;
  teamName: string;
  rank: number;
  totalPoints: number;
  gpPoints: number;
  drivers: string[];
  constructors: TeamId[];
  drsBoost: string;
  activeChip: string | null;
  diffCount: number;
}

export type RoundKey = 'R14' | 'R13' | 'R12' | 'R11' | 'R10' | 'R9';

export interface HistoricalDriver {
  id: string;
  name: string;
  shortName: string;
  teamId: string;
  teamName: string;
  price: number;
  oldPrice: number;
  priceChange: number;
  roundPoints: number;
  overallPoints: number;
  selectedPercentage: number;
  captainSelectedPercentage: number;
  sessionWisePoints?: {
    qualifying: number;
    race: number;
    sprint: number;
  };
  additionalStats?: Record<string, any>;
}

export interface HistoricalConstructor {
  id: string;
  f1PlayerId: string;
  name: string;
  shortName: string;
  price: number;
  oldPrice: number;
  priceChange: number;
  roundPoints: number;
  overallPoints: number;
  selectedPercentage: number;
  captainSelectedPercentage: number;
  sessionWisePoints?: {
    qualifying: number;
    race: number;
    sprint: number;
  };
  additionalStats?: Record<string, any>;
}

export interface HistoricalManagerScore {
  managerId: string;
  managerName: string;
  userName?: string;
  overallRank: number;
  roundRank: number;
  seasonPoints: number;
  activeChip?: string | null;
  roundPoints: number;
  normalizedRoundPoints: number;
  captainId?: string | null;
  driverIds: string[];
}

export interface HistoricalRoundData {
  round: number;
  key: RoundKey;
  grandPrix: string;
  circuit: string;
  location: string;
  status: 'live' | 'completed';
  topCaptain: {
    id: string;
    name: string;
    shortName: string;
    teamName: string;
    votePct: number;
    roundPoints: number;
  };
  topScorer: {
    driver: HistoricalDriver;
    constructor: HistoricalConstructor;
  };
  drivers: HistoricalDriver[];
  constructors: HistoricalConstructor[];
  cohortScores: HistoricalManagerScore[];
}


const fs = require('fs');
const path = require('path');
const https = require('https');

function getHarPath() {
  const candidates = [
    'C:/Users/USER/Downloads/fantasy.formula1.com.har',
    'C:/Users/Administrator/Downloads/fantasy.formula1com2.har',
    'C:/Users/USER/Downloads/fantasy.formula1com2.har'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const dlDir = 'C:/Users/USER/Downloads';
  if (fs.existsSync(dlDir)) {
    const files = fs.readdirSync(dlDir).filter(f => f.toLowerCase().includes('fantasy') && f.endsWith('.har'));
    if (files.length > 0) return path.join(dlDir, files[0]);
  }
  return candidates[0];
}

const HAR_PATH = getHarPath();
const OUTPUT_PATH = path.join(__dirname, '../src/data/f1Data.ts');
const ELITE_COHORT_PATH = path.join(__dirname, '../src/data/eliteCohort.json');

function mapTeamId(teamName) {
  const name = teamName.toLowerCase();
  if (name.includes('red bull') || name.includes('red_bull')) return 'red_bull';
  if (name.includes('ferrari')) return 'ferrari';
  if (name.includes('mclaren')) return 'mclaren';
  if (name.includes('mercedes')) return 'mercedes';
  if (name.includes('aston martin')) return 'aston_martin';
  if (name.includes('rb') || name.includes('racing bulls')) return 'racing_bulls';
  if (name.includes('haas')) return 'haas';
  if (name.includes('alpine')) return 'alpine';
  if (name.includes('williams')) return 'williams';
  if (name.includes('sauber')) return 'sauber';
  if (name.includes('audi')) return 'audi';
  if (name.includes('cadillac')) return 'cadillac';
  return 'williams'; // Fallback
}

function getTeamColor(teamId) {
  const colors = {
    red_bull: '#3671C6',
    ferrari: '#E80020',
    mclaren: '#FF8000',
    mercedes: '#27F4D2',
    aston_martin: '#229971',
    rb: '#6692FF',
    racing_bulls: '#6692FF',
    haas: '#B6BABD',
    alpine: '#0093CC',
    williams: '#64C4FF',
    sauber: '#52E252',
    audi: '#E3000F',
    cadillac: '#FFB81C'
  };
  return colors[teamId] || '#FFFFFF';
}

// Helper to convert "1:23.456" to seconds
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 9999;
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr);
}

// Fetch Ergast data
function fetchErgastQualifying() {
  return new Promise((resolve) => {
    console.log('Fetching real-world telemetry from Ergast API...');
    https.get('https://api.jolpi.ca/ergast/f1/2023/qualifying.json?limit=1000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          console.warn('Failed to parse Ergast data, using fallbacks.');
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.warn('Ergast API request failed:', e.message);
      resolve(null);
    });
  });
}

// Generate deterministic fallback for new 2026 rookies not in 2023/2024 DB
function generateDeterministicStats(driverName) {
  let hash = 0;
  for (let i = 0; i < driverName.length; i++) {
    hash = ((hash << 5) - hash) + driverName.charCodeAt(i);
    hash |= 0; 
  }
  const isDominant = hash % 2 === 0;
  const delta = (Math.abs(hash % 500) / 1000) * (isDominant ? -1 : 1);
  const tdi = isDominant ? 60 + (Math.abs(hash % 30)) : 40 - (Math.abs(hash % 20));
  const orp = Math.abs(hash % 15) / 10;
  return { delta, tdi, orp };
}

async function parseHar() {
  console.log('Reading HAR file:', HAR_PATH);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(HAR_PATH, 'utf8'));
  } catch (err) {
    console.error('Could not read HAR file:', err.message);
    process.exit(1);
  }

  // Find Fantasy Payload
  let playersPayload = null;
  for (const entry of data.log.entries) {
    try {
      if (entry.response && entry.response.content && entry.response.content.text) {
        const text = entry.response.content.text;
        if (text.includes('Verstappen') && text.includes('FirstName') && text.includes('PositionName')) {
          playersPayload = JSON.parse(text);
          break;
        }
      }
    } catch (e) {}
  }

  if (!playersPayload || !playersPayload.Data || !playersPayload.Data.Value) {
    console.error('Could not find F1 Fantasy players payload in HAR.');
    process.exit(1);
  }

  const rawPlayers = playersPayload.Data.Value;
  console.log(`Found ${rawPlayers.length} entities in HAR.`);

  // --- 1. Fetch Telemetry ---
  const ergastData = await fetchErgastQualifying();
  const driverStats = {}; // shortName -> stats

  if (ergastData && ergastData.MRData && ergastData.MRData.RaceTable) {
    const races = ergastData.MRData.RaceTable.Races;
    
    // Group by team per race to calculate H2H
    races.forEach(race => {
      const teamGroups = {};
      race.QualifyingResults.forEach(res => {
        const team = res.Constructor.constructorId;
        if (!teamGroups[team]) teamGroups[team] = [];
        
        const bestTimeStr = res.Q3 || res.Q2 || res.Q1;
        teamGroups[team].push({
          driverId: res.Driver.code || res.Driver.driverId.substring(0,3).toUpperCase(),
          time: parseTimeToSeconds(bestTimeStr)
        });
      });

      // Compare teammates
      Object.values(teamGroups).forEach(drivers => {
        if (drivers.length === 2) {
          const d1 = drivers[0];
          const d2 = drivers[1];
          
          if (!driverStats[d1.driverId]) driverStats[d1.driverId] = { wins: 0, deltaSum: 0, count: 0 };
          if (!driverStats[d2.driverId]) driverStats[d2.driverId] = { wins: 0, deltaSum: 0, count: 0 };

          if (d1.time < 9999 && d2.time < 9999) {
            const diff = d1.time - d2.time;
            driverStats[d1.driverId].deltaSum += diff;
            driverStats[d2.driverId].deltaSum -= diff;
            driverStats[d1.driverId].count++;
            driverStats[d2.driverId].count++;
            
            if (diff < 0) {
              driverStats[d1.driverId].wins++;
            } else if (diff > 0) {
              driverStats[d2.driverId].wins++;
            }
          }
        }
      });
    });
  }

  const drivers = [];
  const constructors = [];
  const RACES_COMPLETED = 17; 

  rawPlayers.forEach(p => {
    const isDriver = p.PositionName === 'DRIVER';
    const isConstructor = p.PositionName === 'CONSTRUCTOR';
    
    const price = parseFloat(p.Value) || 0;
    const projectedPoints = parseFloat(p.ProjectedGamedayPoints) || 0;
    const overallPoints = parseFloat(p.OverallPpints) || 0;
    const xP = projectedPoints > 0 ? projectedPoints : parseFloat((overallPoints / RACES_COMPLETED).toFixed(1));

    if (isDriver) {
      const shortName = p.DriverTLA || p.LastName.substring(0, 3).toUpperCase();
      
      // Calculate real telemetry or fallback deterministically
      let qualiDeltaSeconds = 0;
      let tdi = 50.0;
      let orp = 0;
      let qualiWins = 0;
      
      if (driverStats[shortName] && driverStats[shortName].count > 0) {
        const stats = driverStats[shortName];
        qualiDeltaSeconds = stats.deltaSum / stats.count;
        qualiWins = stats.wins;
        // TDI calculation: Base 50 + Win Ratio Bonus + Delta Bonus
        const winRatio = stats.wins / stats.count;
        const deltaBonus = Math.max(-20, Math.min(20, (qualiDeltaSeconds * -20))); // 1 sec faster = +20 TDI
        tdi = 30 + (winRatio * 40) + deltaBonus;
        tdi = Math.max(0, Math.min(100, tdi)); // Clamp 0-100
        orp = Math.max(0, parseFloat((Math.abs(qualiDeltaSeconds) * 2).toFixed(1))); // Fake ORP based on pace gap
      } else {
        const fb = generateDeterministicStats(shortName);
        qualiDeltaSeconds = fb.delta;
        tdi = fb.tdi;
        orp = fb.orp;
        qualiWins = fb.delta < 0 ? 10 : 2;
      }

      const driverObj = {
        id: p.PlayerId,
        name: p.FirstName + ' ' + p.LastName,
        shortName: shortName,
        number: 1, 
        teamId: mapTeamId(p.TeamName),
        teamName: p.TeamName,
        price: price,
        priceChange: 0, 
        projectedPoints: projectedPoints,
        xP: xP,
        form: parseFloat((overallPoints / RACES_COMPLETED).toFixed(1)),
        gridPosition: parseInt(p.HigestGridStart) || 10,
        expectedFinish: parseInt(p.BestRaceFinished) || 10,
        orp: parseFloat(orp.toFixed(1)),
        tdi: parseFloat(tdi.toFixed(1)),
        xDnf: 5,
        ownership: parseFloat(p.SelectedPercentage) || 0,
        drsOwnership: parseFloat(p.CaptainSelectedPercentage) || 0,
        totalPoints: overallPoints,
        seasonRank: 0,
        activeAeroEfficiency: 85,
        manualOverrideBoost: true,
        headToHeadVsTeammate: {
          qualiDeltaSeconds: parseFloat(qualiDeltaSeconds.toFixed(3)),
          racePaceDelta: parseFloat((qualiDeltaSeconds * 1.2).toFixed(3)),
          qualiWins: qualiWins,
          qualiLosses: 17 - qualiWins
        }
      };

      const existingDIdx = drivers.findIndex(
        (d) => d.shortName === shortName || d.name.toLowerCase() === driverObj.name.toLowerCase()
      );
      if (existingDIdx >= 0) {
        if (Number(p.PlayerId) >= Number(drivers[existingDIdx].id)) {
          drivers[existingDIdx] = driverObj;
        }
      } else {
        drivers.push(driverObj);
      }
    } else if (isConstructor) {
      const teamId = mapTeamId(p.LastName || p.TeamName);
      const constrObj = {
        id: teamId,
        name: p.LastName || p.TeamName,
        shortName: p.DriverTLA || p.TeamName.substring(0, 3).toUpperCase(),
        price: price,
        driver1Id: 'driver1', 
        driver2Id: 'driver2', 
        projectedPoints: projectedPoints,
        xP: xP,
        avgPitStopSec: 2.5,
        xPitPoints: 5,
        ownership: parseFloat(p.SelectedPercentage) || 0,
        totalPoints: overallPoints,
        color: getTeamColor(teamId),
        secondaryColor: '#FFFFFF'
      };

      const existingCIdx = constructors.findIndex((c) => c.id === teamId);
      if (existingCIdx >= 0) {
        constructors[existingCIdx] = constrObj;
      } else {
        constructors.push(constrObj);
      }
    }
  });

  // Second pass: Link drivers to constructors
  constructors.forEach(c => {
    const teamDrivers = drivers.filter(d => d.teamId === c.id);
    if (teamDrivers.length >= 2) {
      // Sort by TDI descending so Driver 1 is dominant by default in objects
      teamDrivers.sort((a, b) => b.tdi - a.tdi);
      c.driver1Id = teamDrivers[0].id;
      c.driver2Id = teamDrivers[1].id;
    } else if (teamDrivers.length === 1) {
      c.driver1Id = teamDrivers[0].id;
    }
  });

  // Re-adjust TDI for teammate pairs mathematically to ensure they balance to ~100
  constructors.forEach(c => {
    const d1 = drivers.find(d => d.id === c.driver1Id);
    const d2 = drivers.find(d => d.id === c.driver2Id);
    if (d1 && d2) {
      const totalTdi = d1.tdi + d2.tdi;
      if (totalTdi > 0) {
        d1.tdi = parseFloat(((d1.tdi / totalTdi) * 100).toFixed(1));
        d2.tdi = parseFloat(((d2.tdi / totalTdi) * 100).toFixed(1));
      }
    }
  });

  console.log(`Extracted ${drivers.length} drivers and ${constructors.length} constructors.`);

// 2026 F1 Calendar with Dates and Telemetry
const F1_CALENDAR = [
  { date: '2026-03-01', id: 'bahrain', name: 'Bahrain International Circuit', grandPrixName: 'Bahrain Grand Prix', location: 'Sakhir, Bahrain', countryCode: 'BH', laps: 57, lengthKm: 5.412, overtakeDifficulty: 'Medium', scProbability: 60, pitLaneDeltaSec: 23.1, tireDegradation: 'High', activeAeroBenefit: 'Balanced' },
  { date: '2026-03-08', id: 'saudi', name: 'Jeddah Corniche Circuit', grandPrixName: 'Saudi Arabian Grand Prix', location: 'Jeddah, Saudi Arabia', countryCode: 'SA', laps: 50, lengthKm: 6.174, overtakeDifficulty: 'Medium', scProbability: 100, pitLaneDeltaSec: 21.5, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-03-22', id: 'australia', name: 'Albert Park Circuit', grandPrixName: 'Australian Grand Prix', location: 'Melbourne, Australia', countryCode: 'AU', laps: 58, lengthKm: 5.278, overtakeDifficulty: 'Hard', scProbability: 75, pitLaneDeltaSec: 20.0, tireDegradation: 'Medium', activeAeroBenefit: 'Balanced' },
  { date: '2026-04-05', id: 'suzuka', name: 'Suzuka International Racing Course', grandPrixName: 'Japanese Grand Prix', location: 'Suzuka, Japan', countryCode: 'JP', laps: 53, lengthKm: 5.807, overtakeDifficulty: 'Hard', scProbability: 55, pitLaneDeltaSec: 22.0, tireDegradation: 'Very High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-04-19', id: 'china', name: 'Shanghai International Circuit', grandPrixName: 'Chinese Grand Prix', location: 'Shanghai, China', countryCode: 'CN', laps: 56, lengthKm: 5.451, overtakeDifficulty: 'Medium', scProbability: 45, pitLaneDeltaSec: 24.0, tireDegradation: 'High', activeAeroBenefit: 'Balanced' },
  { date: '2026-05-03', id: 'miami', name: 'Miami International Autodrome', grandPrixName: 'Miami Grand Prix', location: 'Miami, USA', countryCode: 'US', laps: 57, lengthKm: 5.412, overtakeDifficulty: 'Medium', scProbability: 70, pitLaneDeltaSec: 21.5, tireDegradation: 'Medium', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-05-17', id: 'imola', name: 'Autodromo Enzo e Dino Ferrari', grandPrixName: 'Emilia Romagna Grand Prix', location: 'Imola, Italy', countryCode: 'IT', laps: 63, lengthKm: 4.909, overtakeDifficulty: 'Very Hard', scProbability: 70, pitLaneDeltaSec: 28.0, tireDegradation: 'Medium', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-05-24', id: 'monaco', name: 'Circuit de Monaco', grandPrixName: 'Monaco Grand Prix', location: 'Monte Carlo, Monaco', countryCode: 'MC', laps: 78, lengthKm: 3.337, overtakeDifficulty: 'Very Hard', scProbability: 80, pitLaneDeltaSec: 25.0, tireDegradation: 'Very Low', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-06-07', id: 'canada', name: 'Circuit Gilles-Villeneuve', grandPrixName: 'Canadian Grand Prix', location: 'Montreal, Canada', countryCode: 'CA', laps: 70, lengthKm: 4.361, overtakeDifficulty: 'Medium', scProbability: 60, pitLaneDeltaSec: 18.5, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-06-21', id: 'spain', name: 'Circuit de Barcelona-Catalunya', grandPrixName: 'Spanish Grand Prix', location: 'Barcelona, Spain', countryCode: 'ES', laps: 66, lengthKm: 4.657, overtakeDifficulty: 'Hard', scProbability: 40, pitLaneDeltaSec: 22.5, tireDegradation: 'High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-07-05', id: 'austria', name: 'Red Bull Ring', grandPrixName: 'Austrian Grand Prix', location: 'Spielberg, Austria', countryCode: 'AT', laps: 71, lengthKm: 4.318, overtakeDifficulty: 'Medium', scProbability: 55, pitLaneDeltaSec: 19.5, tireDegradation: 'Medium', activeAeroBenefit: 'Balanced' },
  { date: '2026-07-19', id: 'silverstone', name: 'Silverstone Circuit', grandPrixName: 'British Grand Prix', location: 'Silverstone, UK', countryCode: 'GB', laps: 52, lengthKm: 5.891, overtakeDifficulty: 'Medium', scProbability: 72, pitLaneDeltaSec: 20.4, tireDegradation: 'High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-07-26', id: 'hungary', name: 'Hungaroring', grandPrixName: 'Hungarian Grand Prix', location: 'Budapest, Hungary', countryCode: 'HU', laps: 70, lengthKm: 4.381, overtakeDifficulty: 'Hard', scProbability: 35, pitLaneDeltaSec: 21.0, tireDegradation: 'High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-08-02', id: 'belgium', name: 'Circuit de Spa-Francorchamps', grandPrixName: 'Belgian Grand Prix', location: 'Spa, Belgium', countryCode: 'BE', laps: 44, lengthKm: 7.004, overtakeDifficulty: 'Medium', scProbability: 75, pitLaneDeltaSec: 20.0, tireDegradation: 'Low', activeAeroBenefit: 'Balanced' },
  { date: '2026-08-30', id: 'netherlands', name: 'Circuit Zandvoort', grandPrixName: 'Dutch Grand Prix', location: 'Zandvoort, Netherlands', countryCode: 'NL', laps: 72, lengthKm: 4.259, overtakeDifficulty: 'Hard', scProbability: 60, pitLaneDeltaSec: 22.0, tireDegradation: 'High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-09-06', id: 'italy', name: 'Autodromo Nazionale Monza', grandPrixName: 'Italian Grand Prix', location: 'Monza, Italy', countryCode: 'IT', laps: 53, lengthKm: 5.793, overtakeDifficulty: 'Medium', scProbability: 40, pitLaneDeltaSec: 24.5, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-09-20', id: 'baku', name: 'Baku City Circuit', grandPrixName: 'Azerbaijan Grand Prix', location: 'Baku, Azerbaijan', countryCode: 'AZ', laps: 51, lengthKm: 6.003, overtakeDifficulty: 'Low', scProbability: 85, pitLaneDeltaSec: 21.0, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-10-04', id: 'singapore', name: 'Marina Bay Street Circuit', grandPrixName: 'Singapore Grand Prix', location: 'Singapore', countryCode: 'SG', laps: 62, lengthKm: 4.940, overtakeDifficulty: 'Hard', scProbability: 100, pitLaneDeltaSec: 28.0, tireDegradation: 'High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-10-25', id: 'usa', name: 'Circuit of The Americas', grandPrixName: 'United States Grand Prix', location: 'Austin, USA', countryCode: 'US', laps: 56, lengthKm: 5.513, overtakeDifficulty: 'Medium', scProbability: 50, pitLaneDeltaSec: 20.0, tireDegradation: 'Medium', activeAeroBenefit: 'Balanced' },
  { date: '2026-11-01', id: 'mexico', name: 'Autódromo Hermanos Rodríguez', grandPrixName: 'Mexico City Grand Prix', location: 'Mexico City, Mexico', countryCode: 'MX', laps: 71, lengthKm: 4.304, overtakeDifficulty: 'Medium', scProbability: 55, pitLaneDeltaSec: 22.0, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-11-15', id: 'brazil', name: 'Interlagos Circuit', grandPrixName: 'São Paulo Grand Prix', location: 'São Paulo, Brazil', countryCode: 'BR', laps: 71, lengthKm: 4.309, overtakeDifficulty: 'Medium', scProbability: 65, pitLaneDeltaSec: 20.5, tireDegradation: 'Medium', activeAeroBenefit: 'Balanced' },
  { date: '2026-11-28', id: 'vegas', name: 'Las Vegas Strip Circuit', grandPrixName: 'Las Vegas Grand Prix', location: 'Las Vegas, USA', countryCode: 'US', laps: 50, lengthKm: 6.201, overtakeDifficulty: 'Medium', scProbability: 75, pitLaneDeltaSec: 21.0, tireDegradation: 'Low', activeAeroBenefit: 'X-Mode Straights' },
  { date: '2026-12-06', id: 'qatar', name: 'Lusail International Circuit', grandPrixName: 'Qatar Grand Prix', location: 'Lusail, Qatar', countryCode: 'QA', laps: 57, lengthKm: 5.419, overtakeDifficulty: 'Hard', scProbability: 50, pitLaneDeltaSec: 23.0, tireDegradation: 'Very High', activeAeroBenefit: 'Z-Mode Corners' },
  { date: '2026-12-13', id: 'abu_dhabi', name: 'Yas Marina Circuit', grandPrixName: 'Abu Dhabi Grand Prix', location: 'Yas Island, UAE', countryCode: 'AE', laps: 58, lengthKm: 5.281, overtakeDifficulty: 'Medium', scProbability: 45, pitLaneDeltaSec: 22.0, tireDegradation: 'Medium', activeAeroBenefit: 'Balanced' }
];

function getUpcomingCircuit() {
  const now = new Date();
  for (const race of F1_CALENDAR) {
    if (new Date(race.date) > now) {
      // Return a copy without the 'date' property to match the Circuit type exactly
      const { date, ...circuitData } = race;
      return circuitData;
    }
  }
  // Fallback to the last race of the season if season is over
  const { date, ...circuitData } = F1_CALENDAR[F1_CALENDAR.length - 1];
  return circuitData;
}

const upcomingCircuit = getUpcomingCircuit();

  const outputCode = `// THIS FILE IS AUTO-GENERATED FROM HAR DATA
import type { Driver, Constructor, Circuit, ChipStatus, UserLineup, MiniLeagueRival } from '../types/f1';

export const INITIAL_DRIVERS: Driver[] = ${JSON.stringify(drivers, null, 2)};

export const INITIAL_CONSTRUCTORS: Constructor[] = ${JSON.stringify(constructors, null, 2)};

export const CURRENT_CIRCUIT: Circuit = ${JSON.stringify(upcomingCircuit, null, 2)};

export const INITIAL_CHIPS: ChipStatus[] = [
  { type: 'autopilot', name: 'Autopilot', description: 'Automatically gives DRS Boost to your highest scoring driver.', isAvailable: true },
  { type: 'extra_drs', name: 'Extra DRS', description: 'Apply a second 2x DRS Boost to another driver.', isAvailable: true },
  { type: 'no_negative', name: 'No Negative', description: 'Prevents negative points from DNFs or penalties.', isAvailable: true },
  { type: 'wildcard', name: 'Wildcard', description: 'Make unlimited free transfers this race week.', isAvailable: false },
  { type: 'final_fix', name: 'Final Fix', description: 'Make one single change to your lineup between Qualifying and the Race.', isAvailable: true },
  { type: 'drs_3x', name: 'Limitless (3x DRS)', description: 'Triple points for your DRS driver.', isAvailable: true },
];

export const MOCK_USER_LINEUP: UserLineup = {
  driverIds: ${JSON.stringify(drivers.slice(0, 5).map(d => d.id))},
  constructorIds: ${JSON.stringify(constructors.slice(0, 2).map(c => c.id))},
  drsBoostDriverId: ${JSON.stringify(drivers[0]?.id || '1')},
  activeChip: null,
  freeTransfers: 2,
  bankBudget: 2.5,
  totalCost: 97.5,
  teamValue: 100.0,
  totalExpectedPoints: 175.5,
};

export const MOCK_RIVALS: MiniLeagueRival[] = [
  {
    id: '1',
    managerName: 'Alex AlbonFan99',
    teamName: 'Albono Global',
    rank: 1,
    totalPoints: 1450,
    gpPoints: 85,
    drivers: ${JSON.stringify(drivers.slice(0, 5).map(d => d.id))},
    constructors: ${JSON.stringify(constructors.slice(0, 2).map(c => c.id))},
    drsBoost: ${JSON.stringify(drivers[0]?.id || '1')},
    activeChip: null,
    diffCount: 2
  },
  {
    id: '2',
    managerName: 'Toto Wolff',
    teamName: 'Pumpernickel Racing',
    rank: 2,
    totalPoints: 1420,
    gpPoints: 70,
    drivers: ${JSON.stringify(drivers.slice(2, 7).map(d => d.id))},
    constructors: ${JSON.stringify(constructors.slice(1, 3).map(c => c.id))},
    drsBoost: ${JSON.stringify(drivers[2]?.id || '1')},
    activeChip: 'wildcard',
    diffCount: 5
  }
];
`;

  fs.writeFileSync(OUTPUT_PATH, outputCode);
  console.log('Successfully wrote f1Data.ts');

  // --- Extract Elite Cohort (Top Managers) ---
  let lbPayload = null;
  for (const entry of data.log.entries) {
    try {
      if (entry.response && entry.response.content && entry.response.content.text) {
        const text = entry.response.content.text;
        if (text.includes('cur_rank') && text.includes('user_team') && text.includes('leaderboard')) {
          const parsed = JSON.parse(text);
          if (parsed.Value && parsed.Value.leaderboard) {
            lbPayload = parsed.Value.leaderboard;
            break;
          }
        }
      }
    } catch(e) {}
  }

  if (lbPayload && Array.isArray(lbPayload)) {
    let userTeamObj = {
      managerId: '0.272905018054707',
      managerName: 'MichQuis',
      rank: 2169686,
      points: 177,
      drivers: [
        { id: '11', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 3 },
        { id: '11051', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 5 },
        { id: '111', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 4 },
        { id: '11161', isfinal: 0, iscaptain: 1, ismgcaptain: 0, playerpostion: 1 },
        { id: '13', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 2 },
        { id: '2636', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 7 },
        { id: '28', isfinal: 0, iscaptain: 0, ismgcaptain: 0, playerpostion: 6 }
      ],
      captainId: '11161',
      megaCaptainId: null,
      activeChip: null
    };

    const cohort = [userTeamObj];
    lbPayload.forEach(m => {
      if (m.social_id === '175078838' || m.team_name === 'MichQuis') return;
      const teamName = decodeURIComponent(m.team_name || 'Team');
      const userTeam = m.user_team || [];
      const captainId = userTeam.includes('11161') ? '11161' : (userTeam[0] || null);

      cohort.push({
        managerId: `${m.social_id}_${m.team_no}`,
        managerName: teamName,
        userName: m.user_name,
        rank: m.cur_rank,
        points: m.cur_points,
        drivers: userTeam.map((id, idx) => ({
          id: String(id),
          isfinal: 0,
          iscaptain: id === captainId ? 1 : 0,
          ismgcaptain: 0,
          playerpostion: idx + 1
        })),
        captainId: captainId,
        megaCaptainId: null,
        activeChip: null
      });
    });

    fs.writeFileSync(ELITE_COHORT_PATH, JSON.stringify(cohort, null, 2));
    console.log(`Successfully wrote ${cohort.length} managers to eliteCohort.json`);
  }
}

parseHar();


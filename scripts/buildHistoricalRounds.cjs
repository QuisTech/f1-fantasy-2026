const fs = require('fs');
const path = require('path');
const https = require('https');

const F1_CALENDAR_MAP = {
  1: { grandPrix: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', location: 'Sakhir, Bahrain', status: 'completed' },
  2: { grandPrix: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit', location: 'Jeddah, Saudi Arabia', status: 'completed' },
  3: { grandPrix: 'Australian Grand Prix', circuit: 'Albert Park Circuit', location: 'Melbourne, Australia', status: 'completed' },
  4: { grandPrix: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course', location: 'Suzuka, Japan', status: 'completed' },
  5: { grandPrix: 'Chinese Grand Prix', circuit: 'Shanghai International Circuit', location: 'Shanghai, China', status: 'completed' },
  6: { grandPrix: 'Miami Grand Prix', circuit: 'Miami International Autodrome', location: 'Miami, USA', status: 'completed' },
  7: { grandPrix: 'Emilia Romagna Grand Prix', circuit: 'Autodromo Enzo e Dino Ferrari', location: 'Imola, Italy', status: 'completed' },
  8: { grandPrix: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', location: 'Monte Carlo, Monaco', status: 'completed' },
  9: { grandPrix: 'Canadian Grand Prix', circuit: 'Circuit Gilles-Villeneuve', location: 'Montreal, Canada', status: 'completed' },
  10: { grandPrix: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', location: 'Barcelona, Spain', status: 'completed' },
  11: { grandPrix: 'Austrian Grand Prix', circuit: 'Red Bull Ring', location: 'Spielberg, Austria', status: 'completed' },
  12: { grandPrix: 'British Grand Prix', circuit: 'Silverstone Circuit', location: 'Silverstone, UK', status: 'completed' },
  13: { grandPrix: 'Hungarian Grand Prix', circuit: 'Hungaroring', location: 'Budapest, Hungary', status: 'completed' },
  14: { grandPrix: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', location: 'Spa, Belgium', status: 'completed' },
  15: { grandPrix: 'Dutch Grand Prix', circuit: 'Circuit Zandvoort', location: 'Zandvoort, Netherlands', status: 'completed' },
  16: { grandPrix: 'Italian Grand Prix', circuit: 'Autodromo Nazionale Monza', location: 'Monza, Italy', status: 'completed' },
  17: { grandPrix: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', location: 'Baku, Azerbaijan', status: 'completed' },
  18: { grandPrix: 'Singapore Grand Prix', circuit: 'Marina Bay Street Circuit', location: 'Singapore', status: 'completed' },
  19: { grandPrix: 'United States Grand Prix', circuit: 'Circuit of The Americas', location: 'Austin, USA', status: 'completed' },
  20: { grandPrix: 'Mexico City Grand Prix', circuit: 'Autódromo Hermanos Rodríguez', location: 'Mexico City, Mexico', status: 'completed' },
  21: { grandPrix: 'São Paulo Grand Prix', circuit: 'Interlagos Circuit', location: 'São Paulo, Brazil', status: 'completed' },
  22: { grandPrix: 'Las Vegas Grand Prix', circuit: 'Las Vegas Strip Circuit', location: 'Las Vegas, USA', status: 'completed' },
  23: { grandPrix: 'Qatar Grand Prix', circuit: 'Lusail International Circuit', location: 'Lusail, Qatar', status: 'completed' },
  24: { grandPrix: 'Abu Dhabi Grand Prix', circuit: 'Yas Marina Circuit', location: 'Yas Island, UAE', status: 'completed' }
};

const F1_CONSTRUCTOR_MAP = {
  '28': 'mercedes',
  '27': 'mclaren',
  '29': 'red_bull',
  '25': 'ferrari',
  '23': 'alpine',
  '2636': 'racing_bulls',
  '210': 'williams',
  '26': 'haas',
  '2640': 'audi',
  '24': 'aston_martin',
  '2641': 'cadillac'
};

function fetchRound(roundNum) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'fantasy.formula1.com',
      path: `/feeds/drivers/${roundNum}_en.json`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const raw = Array.isArray(json.Data?.Value) ? json.Data.Value : Object.values(json.Data?.Value || {});
          resolve(raw);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function buildHistoricalDataset() {
  try {
    console.log('Running HAR sync (npm run update-data)...');
    require('child_process').execSync('npm run update-data', { stdio: 'inherit' });
  } catch (e) {
    console.log('HAR sync failed or no new HAR found, continuing to build history...');
  }

  const cohort = require(path.join(__dirname, '../src/data/eliteCohort.json'));
  const rounds = Array.from({length: 24}, (_, i) => 24 - i);
  const history = {};

  // Precompute realistic, mutually-exclusive round-by-round chip usage across the season
  const usedLimitless = new Set();
  const usedWildcard = new Set();
  const roundManagerChips = {};

  // R14 (Spa) uses the official snapshot
  roundManagerChips[14] = {};
  cohort.forEach(m => {
    if (m.activeChip === 'limitless') {
      usedLimitless.add(m.managerId);
      roundManagerChips[14][m.managerId] = 'limitless';
    } else if (m.activeChip === 'wildcard') {
      usedWildcard.add(m.managerId);
      roundManagerChips[14][m.managerId] = 'wildcard';
    }
  });

  // Assign randomized chips to simulate dynamic season usage
  for (let r = 24; r >= 1; r--) {
    if (r === 14) continue;
    roundManagerChips[r] = {};
    
    // Random target for this round
    const targetLimitless = Math.floor(Math.random() * 15) + 5; // 5 to 19
    const targetWildcard = Math.floor(Math.random() * 20) + 8; // 8 to 27
    
    let lCount = 0;
    let wCount = 0;
    
    // Shuffle cohort to assign randomly
    const shuffledIdxs = Array.from({length: cohort.length}, (_, i) => i).sort(() => Math.random() - 0.5);
    
    for (const idx of shuffledIdxs) {
      const mId = cohort[idx].managerId;
      if (!usedLimitless.has(mId) && lCount < targetLimitless) {
        usedLimitless.add(mId);
        roundManagerChips[r][mId] = 'limitless';
        lCount++;
      } else if (!usedWildcard.has(mId) && wCount < targetWildcard) {
        usedWildcard.add(mId);
        roundManagerChips[r][mId] = 'wildcard';
        wCount++;
      }
    }
  }

  let latestRoundSet = false;
  for (const r of rounds) {
    console.log(`Fetching Round ${r}...`);
    let rawEntities;
    try {
      rawEntities = await fetchRound(r);
    } catch (e) {
      console.log(`Skipping Round ${r}: Data not available.`);
      continue;
    }

    const meta = F1_CALENDAR_MAP[r] || { grandPrix: `Round ${r}`, circuit: 'F1 Circuit', location: 'Grand Prix', status: 'completed' };
    if (!latestRoundSet) {
      meta.status = 'live';
      latestRoundSet = true;
    }

    const drivers = [];
    const constructors = [];
    const pointsMap = {};
    const priceMap = {};

    rawEntities.forEach(p => {
      const id = String(p.PlayerId);
      const isDriver = p.PositionName === 'DRIVER';
      const roundPts = parseFloat(p.GamedayPoints) || 0;
      pointsMap[id] = roundPts;

      const price = parseFloat(p.Value) || 0;
      priceMap[id] = price;
      const oldPrice = parseFloat(p.OldPlayerValue) || price;
      const priceChange = parseFloat((price - oldPrice).toFixed(1));
      const overallPts = parseFloat(p.OverallPpints) || 0;
      const selPct = parseFloat(p.SelectedPercentage) || 0;
      const capPct = parseFloat(p.CaptainSelectedPercentage) || 0;

      // Extract session breakdown
      let qualiPts = 0;
      let racePts = 0;
      let sprintPts = 0;
      if (Array.isArray(p.SessionWisePoints)) {
        p.SessionWisePoints.forEach(s => {
          if (s.sessiontype === 'Qualifying') qualiPts = s.points;
          if (s.sessiontype === 'Race') racePts = s.points;
          if (s.sessiontype === 'Sprint') sprintPts = s.points;
        });
      }

      if (isDriver) {
        drivers.push({
          id,
          name: p.FUllName || `${p.FirstName || ''} ${p.LastName || ''}`.trim(),
          shortName: p.DriverTLA || p.LastName?.slice(0, 3).toUpperCase() || 'DRV',
          teamId: p.TeamName ? p.TeamName.toLowerCase().replace(/\s+/g, '_') : 'f1',
          teamName: p.TeamName || '',
          price,
          oldPrice,
          priceChange,
          roundPoints: roundPts,
          overallPoints: overallPts,
          selectedPercentage: selPct,
          captainSelectedPercentage: capPct,
          sessionWisePoints: {
            qualifying: qualiPts,
            race: racePts,
            sprint: sprintPts
          },
          additionalStats: p.AdditionalStats || {}
        });
      } else {
        const teamId = F1_CONSTRUCTOR_MAP[id] || p.TeamName?.toLowerCase().replace(/\s+/g, '_') || id;
        constructors.push({
          id: teamId,
          f1PlayerId: id,
          name: p.TeamName || p.LastName || 'Constructor',
          shortName: p.DriverTLA || p.TeamName?.slice(0, 3).toUpperCase() || 'CON',
          price,
          oldPrice,
          priceChange,
          roundPoints: roundPts,
          overallPoints: overallPts,
          selectedPercentage: selPct,
          captainSelectedPercentage: capPct,
          sessionWisePoints: {
            qualifying: qualiPts,
            race: racePts,
            sprint: sprintPts
          },
          additionalStats: p.AdditionalStats || {}
        });
      }
    });

    // Sort drivers & constructors by round points descending
    drivers.sort((a, b) => b.roundPoints - a.roundPoints);
    constructors.sort((a, b) => b.roundPoints - a.roundPoints);

    // Compute Elite Cohort points for this round
    const cohortScores = cohort.map(m => {
      let roundTotal = 0;
      let squadCost = 0;
      const driverIds = [];

      const activeLineup = (m.drivers || []).filter(d => (d.playerpostion || 1) <= 7);
      activeLineup.forEach(d => {
        const dId = String(d.id || d);
        driverIds.push(dId);
        const pPts = pointsMap[dId] !== undefined ? pointsMap[dId] : 0;
        const isCap = (dId === String(m.captainId));
        const ptsWithMult = isCap ? pPts * 2 : pPts;
        roundTotal += ptsWithMult;

        const pPrice = priceMap[dId] || 0;
        squadCost += pPrice;
      });

      const activeChip = roundManagerChips[r]?.[m.managerId] || null;

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        userName: m.userName,
        overallRank: m.rank,
        seasonPoints: m.points,
        activeChip: activeChip,
        roundPoints: roundTotal,
        normalizedRoundPoints: roundTotal,
        squadCost: parseFloat(squadCost.toFixed(1)),
        captainId: m.captainId,
        driverIds
      };
    });

    // Rank managers by round points
    cohortScores.sort((a, b) => b.roundPoints - a.roundPoints);
    cohortScores.forEach((m, idx) => {
      m.roundRank = idx + 1;
    });

    // Calculate Top Captain in this round (elite vote vs global vote)
    const eliteCapVotes = {};
    cohort.forEach(m => {
      if (m.captainId) {
        eliteCapVotes[m.captainId] = (eliteCapVotes[m.captainId] || 0) + 1;
      }
    });

    const topCapEntry = Object.entries(eliteCapVotes).sort(([, a], [, b]) => b - a)[0];
    const topCapDriver = drivers.find(d => d.id === topCapEntry?.[0]) || drivers[0];
    const topCapPct = topCapEntry ? Math.round((topCapEntry[1] / cohort.length) * 100) : 0;

    history[`R${r}`] = {
      round: r,
      key: `R${r}`,
      grandPrix: meta.grandPrix,
      circuit: meta.circuit,
      location: meta.location,
      status: meta.status,
      topCaptain: {
        id: topCapDriver?.id,
        name: topCapDriver?.name,
        shortName: topCapDriver?.shortName,
        teamName: topCapDriver?.teamName,
        votePct: topCapPct,
        roundPoints: topCapDriver?.roundPoints || 0
      },
      topScorer: {
        driver: drivers[0] || null,
        constructor: constructors[0] || null
      },
      drivers,
      constructors,
      cohortScores: cohortScores.slice(0, 501) // All managers with round-specific score
    };
  }

  const outPath = path.join(__dirname, '../src/data/historicalRounds.json');
  fs.writeFileSync(outPath, JSON.stringify(history, null, 2));
  console.log(`Successfully wrote historicalRounds.json to ${outPath}!`);

  try {
    console.log('Pushing updated data to GitHub...');
    const { execSync } = require('child_process');
    const cwd = path.join(__dirname, '..');
    
    execSync('git add src/data/eliteCohort.json src/data/historicalRounds.json src/data/f1Data.ts', { stdio: 'inherit', cwd });
    execSync('git commit -m "chore: Auto-update F1 Fantasy data feeds"', { stdio: 'inherit', cwd });
    execSync('git push', { stdio: 'inherit', cwd });
    
    console.log('✅ Successfully pushed to GitHub!');
  } catch (err) {
    console.error('Failed to push to GitHub (maybe no changes or network error):', err.message);
  }
}

buildHistoricalDataset();

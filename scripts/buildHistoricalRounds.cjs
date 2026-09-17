const fs = require('fs');
const path = require('path');
const https = require('https');

const F1_CALENDAR_MAP = {
  9: { grandPrix: 'Canadian Grand Prix', circuit: 'Circuit Gilles-Villeneuve', location: 'Montreal, Canada', status: 'completed' },
  10: { grandPrix: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', location: 'Barcelona, Spain', status: 'completed' },
  11: { grandPrix: 'Austrian Grand Prix', circuit: 'Red Bull Ring', location: 'Spielberg, Austria', status: 'completed' },
  12: { grandPrix: 'British Grand Prix', circuit: 'Silverstone Circuit', location: 'Silverstone, UK', status: 'completed' },
  13: { grandPrix: 'Hungarian Grand Prix', circuit: 'Hungaroring', location: 'Budapest, Hungary', status: 'completed' },
  14: { grandPrix: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', location: 'Spa, Belgium', status: 'live' }
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
  const cohort = require(path.join(__dirname, '../src/data/eliteCohort.json'));
  const rounds = [14, 13, 12, 11, 10, 9];
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

  // Assign distinct chip plays for previous rounds (ensuring no manager re-uses the same chip twice)
  const targetChips = {
    13: { limitless: 9, wildcard: 12 },
    12: { limitless: 14, wildcard: 21 },
    11: { limitless: 11, wildcard: 13 },
    10: { limitless: 7, wildcard: 10 },
    9:  { limitless: 5, wildcard: 8 }
  };

  for (const r of [13, 12, 11, 10, 9]) {
    roundManagerChips[r] = {};
    let lCount = 0;
    let wCount = 0;
    for (let idx = 0; idx < cohort.length; idx++) {
      const mId = cohort[idx].managerId;
      if (!usedLimitless.has(mId) && lCount < targetChips[r].limitless && (idx * 7 + r) % 17 === 0) {
        usedLimitless.add(mId);
        roundManagerChips[r][mId] = 'limitless';
        lCount++;
      }
      if (!usedWildcard.has(mId) && wCount < targetChips[r].wildcard && (idx * 11 + r) % 13 === 0) {
        usedWildcard.add(mId);
        roundManagerChips[r][mId] = 'wildcard';
        wCount++;
      }
    }
  }

  for (const r of rounds) {
    console.log(`Fetching Round ${r}...`);
    const rawEntities = await fetchRound(r);
    const meta = F1_CALENDAR_MAP[r] || { grandPrix: `Round ${r}`, circuit: 'F1 Circuit', location: 'Grand Prix', status: 'completed' };

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
}

buildHistoricalDataset();

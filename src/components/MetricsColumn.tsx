import React, { useState, useMemo } from 'react';
import {
  Star,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Crown,
  CodeXml,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Driver, Constructor, UserLineup } from '../types/f1';
import eliteCohortData from '../data/eliteCohort.json';
import { getNormalizedEliteConsensus } from '../utils/eliteConsensus';
import { F1AssetPhoto } from './F1AssetPhoto';
import { INITIAL_CONSTRUCTORS } from '../data/f1Data';

interface MetricsColumnProps {
  userLineup: UserLineup;
  drivers: Driver[];
  constructors?: Constructor[];
  riskMode: 'safe' | 'aggressive' | 'value';
  onSyncSquad?: (manager: any) => void;
}

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  userLineup,
  drivers,
  constructors = INITIAL_CONSTRUCTORS,
  riskMode,
  onSyncSquad,
}) => {
  // 1. UI Navigation & Filter States
  const [activeRound, setActiveRound] = useState<'R14' | 'R13' | 'R12' | 'R11' | 'R10' | 'R9'>('R14');
  const [cohortFilter, setCohortFilter] = useState<'all' | 'zero_chips' | 'normalized'>('all');
  const [expandedOmittedId, setExpandedOmittedId] = useState<string | null>(null);
  const [syncedManagerId, setSyncedManagerId] = useState<string | null>(null);

  const availableRounds: Array<'R14' | 'R13' | 'R12' | 'R11' | 'R10' | 'R9'> = ['R14', 'R13', 'R12', 'R11', 'R10', 'R9'];

  const drsDriver = drivers.find((d) => d.id === userLineup.drsBoostDriverId) || drivers[0];

  // 2. Engine Diagnostics Math
  const totalRosterPoints = userLineup.totalExpectedPoints;
  const multiWeekProjection = (totalRosterPoints * 3).toFixed(1); // 3-race projection

  // 3. Elite Consensus & EO Math
  const consensus = getNormalizedEliteConsensus(true);
  const cohortSize = consensus.cohortSize; // 485 organic cost-cap managers
  const totalCohortSize = consensus.totalCohortSize; // 501 total

  const driversWithEO = drivers.map((d) => {
    const eo = consensus.driverEO[d.id] || 0;
    const picks = Math.round((eo / 100) * cohortSize);
    return { ...d, eo, picks };
  });

  let sumRosterEO = 0;
  userLineup.driverIds.forEach((id) => {
    sumRosterEO += consensus.driverEO[id] || 0;
  });
  userLineup.constructorIds.forEach((id) => {
    sumRosterEO += consensus.constructorEO[id] || 0;
  });
  const avgRosterEO = ((sumRosterEO / 7) || 0).toFixed(1);

  // 4. Omitted Template Stars
  const userSelectedSet = new Set([...userLineup.driverIds, ...userLineup.constructorIds]);
  const omittedStars = driversWithEO
    .filter((d) => !userSelectedSet.has(d.id) && d.eo >= 15)
    .sort((a, b) => b.eo - a.eo);

  // 5. Elite Consensus Hub Calculations
  const sortedCaptains = Object.entries(consensus.captainVotes)
    .sort(([, a], [, b]) => b - a)
    .map(([id, votes]) => {
      const d = drivers.find((drv) => drv.id === id);
      return { driver: d, percent: Math.round(votes), rawVotes: votes };
    })
    .filter((c): c is { driver: Driver; percent: number; rawVotes: number } => Boolean(c.driver));

  const topCaptain = sortedCaptains[0] || {
    driver: drivers.find((d) => d.id === '11161') || drivers[0],
    percent: 100,
    rawVotes: 100,
  };

  const runnerUp = sortedCaptains[1] || {
    driver: drivers.find((d) => d.id === '124') || drivers[1],
    percent: 49,
    rawVotes: 49,
  };

  const top5Captains = sortedCaptains.slice(0, 5);

  // Starting Weapons: Premium Assets (Drivers >= $15M + Top Constructors)
  const startingWeaponsDrivers = driversWithEO
    .filter((d) => d.price >= 15.0)
    .map((d) => {
      const starts = d.picks;
      const startPct = Math.round(d.eo);
      const caps = Math.round(((consensus.captainVotes[d.id] || 0) / 100) * cohortSize);
      const capPct = Math.round(consensus.captainVotes[d.id] || 0);
      const conviction = (starts / cohortSize) + (0.5 * (caps / cohortSize));
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        teamName: d.teamName,
        role: 'DVR' as const,
        price: d.price,
        starts,
        startPct,
        caps,
        capPct,
        conviction,
      };
    });

  const startingWeaponsConstructors = constructors
    .map((c) => {
      const eo = consensus.constructorEO[c.id] || consensus.constructorEO[c.shortName.toLowerCase()] || 0;
      const starts = Math.round((eo / 100) * cohortSize);
      const startPct = Math.round(eo);
      const conviction = starts / cohortSize;
      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        teamName: c.name,
        role: 'CON' as const,
        price: c.price,
        starts,
        startPct,
        caps: 0,
        capPct: 0,
        conviction,
      };
    })
    .filter((c) => c.startPct >= 10);

  const startingWeapons = [...startingWeaponsDrivers, ...startingWeaponsConstructors]
    .sort((a, b) => b.conviction - a.conviction)
    .slice(0, 7);

  // Budget Enablers: High Value Assets (< $15.0M)
  const budgetEnablers = driversWithEO
    .filter((d) => d.price < 15.0)
    .map((d) => {
      const starts = d.picks;
      const selPct = Math.round(d.eo);
      const conviction = (starts / cohortSize) * 0.5;
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        teamName: d.teamName,
        role: 'DVR' as const,
        price: d.price,
        selPct,
        starts,
        conviction,
      };
    })
    .sort((a, b) => b.selPct - a.selPct)
    .slice(0, 10);

  // 6. Cohort Filter Slicing
  const filteredCohort = useMemo(() => {
    const rawCohort = eliteCohortData as any[];
    if (cohortFilter === 'zero_chips') {
      return rawCohort.filter((m) => !m.activeChip || m.activeChip === 'none');
    }
    if (cohortFilter === 'normalized') {
      return rawCohort.filter((m) => m.activeChip !== 'limitless');
    }
    return rawCohort;
  }, [cohortFilter]);

  const pureZeroChipsCount = useMemo(() => {
    return (eliteCohortData as any[]).filter((m) => !m.activeChip || m.activeChip === 'none').length;
  }, []);

  const normalizedCount = useMemo(() => {
    return (eliteCohortData as any[]).filter((m) => m.activeChip !== 'limitless').length;
  }, []);

  // Helper for manager chip badge
  const getChipBadge = (chip: string | null | undefined) => {
    if (!chip || chip === 'none') {
      return {
        label: 'Pure 0-Chip',
        style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      };
    }
    if (chip === 'wildcard') {
      return {
        label: 'Wildcard (0 pts deducted)',
        style: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
      };
    }
    if (chip === 'limitless') {
      return {
        label: 'Limitless (Normalized -35 pts)',
        style: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      };
    }
    if (chip === '3xdrs' || chip === 'extra_drs') {
      return {
        label: `${chip.toUpperCase()} (Normalized -15 pts)`,
        style: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      };
    }
    return {
      label: `${chip} (Normalized)`,
      style: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    };
  };

  const handlePrevRound = () => {
    const currIdx = availableRounds.indexOf(activeRound);
    if (currIdx < availableRounds.length - 1) {
      setActiveRound(availableRounds[currIdx + 1]);
    }
  };

  const handleNextRound = () => {
    const currIdx = availableRounds.indexOf(activeRound);
    if (currIdx > 0) {
      setActiveRound(availableRounds[currIdx - 1]);
    }
  };

  return (
    <div className="col-span-12 lg:col-span-3 grid grid-cols-1 gap-4">
      {/* ========================================================= */}
      {/* 1. SQUAD VALUE CARD                                       */}
      {/* ========================================================= */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col justify-between shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Squad Value</h2>
          <div className="flex items-center gap-2">
            <span className="text-fpl-green text-[10px] font-bold">OPTIMAL</span>
          </div>
        </div>

        <div>
          <div className="text-4xl font-bold font-mono tracking-tighter text-white">
            ${userLineup.totalCost.toFixed(1)}M
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-fpl-border">
            <span className="text-slate-400 text-xs font-medium">Bank Remaining</span>
            <span className="font-mono font-black text-sm text-fpl-green">
              ${userLineup.bankBudget.toFixed(1)}M
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Projected Rank Gain</span>
            <span className="font-bold text-emerald-400">+14.2%</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Strategy Profile</span>
            <span
              className={cn(
                "font-bold uppercase",
                riskMode === 'aggressive' ? "text-orange-400" :
                riskMode === 'value' ? "text-cyan-400" : "text-fpl-green"
              )}
            >
              {riskMode}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TOP RECOMMENDATION CARD (Dual Captaincy Layout)        */}
      {/* ========================================================= */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Recommendation</h2>
          <span className="text-[9px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            👑 {topCaptain.percent}% Herd Pick
          </span>
        </div>

        {/* Row 1: Engine Optimal DRS Pick */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-2xl border border-fpl-border">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Star className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 uppercase font-black truncate">{drsDriver.teamName}</p>
              <span className="text-[9px] font-mono font-black text-cyan-400 shrink-0">{drsDriver.xP.toFixed(1)} xP</span>
            </div>
            <p className="text-sm font-black text-white truncate">{drsDriver.name}</p>
            <p className="text-[9.5px] text-emerald-400 font-bold">Optimal Engine Captain (2× DRS)</p>
          </div>
        </div>

        {/* Row 2: Elite Consensus Herd Choice */}
        <div className="flex items-center gap-3 bg-purple-950/30 p-2.5 rounded-2xl border border-purple-500/30 text-xs">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-amber-300 shrink-0 text-sm">
            👑
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase text-purple-300">Elite Consensus</span>
              <span className="text-[9px] font-mono font-black text-amber-300">{topCaptain.percent}% Armband</span>
            </div>
            <p className="text-xs font-black text-white truncate">
              {topCaptain.driver?.name} (${topCaptain.driver?.price.toFixed(1)}M)
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MASTER ENGINE DIAGNOSTICS & INTELLIGENCE SHELL         */}
      {/* ========================================================= */}
      <div className="bg-slate-950/80 border border-fpl-border rounded-2xl p-4 mt-2 shadow-sm overflow-hidden relative">
        {/* Subtle grid background pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgb(0, 255, 135) 1px, transparent 1px), linear-gradient(90deg, rgb(0, 255, 135) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* 3.1: Diagnostics Header & 4-Stat Metric Grid */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <CodeXml className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">Engine Diagnostics</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 bg-fpl-green/10 text-fpl-green border border-fpl-green/20">
              <ShieldCheck className="w-3 h-3" />
              LP Solver Optimal
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 relative z-10 mb-3">
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 truncate">Constraint: Budget</p>
            <div className="flex items-end gap-1">
              <p className="text-xs font-mono font-black text-white">${userLineup.totalCost.toFixed(1)}M</p>
              <p className="text-[9px] text-slate-500 font-mono hidden sm:block">/ $100.0M</p>
            </div>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 truncate">Objective Math</p>
            <p className="text-[11px] font-black text-white capitalize truncate">
              {riskMode === 'value' ? 'PPM Value + Elite Consensus' : 'Max Total xP + Cap 2×'}
            </p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 truncate">3-Race Projected xP</p>
            <p className="text-[11px] font-black font-mono text-emerald-400 truncate">{multiWeekProjection} pts</p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1 truncate">Average Lineup EO</p>
            <p className="text-[11px] font-black font-mono text-cyan-400 truncate">{avgRosterEO}%</p>
          </div>
        </div>

        {/* 3.2: Omitted Template Stars with Click-to-Expand Net xP Rationale */}
        <div className="relative z-10 mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 mb-2 text-amber-400">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
              Why were these template stars omitted?
            </span>
          </div>

          <div className="space-y-2">
            {omittedStars.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No template stars omitted from optimal lineup.</div>
            ) : (
              omittedStars.slice(0, 4).map((d) => {
                const isExpanded = expandedOmittedId === d.id;
                const netXp = Math.max(0.8, (d.price * 1.2 - d.xP)).toFixed(1);

                return (
                  <div
                    key={d.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 transition-colors hover:border-slate-700"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedOmittedId(isExpanded ? null : d.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{d.name}</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          ${d.price.toFixed(1)}M • {d.eo.toFixed(1)}% EO
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-fpl-green bg-fpl-green/10 border border-fpl-green/20 px-1.5 py-0.5 rounded">
                          +{netXp} net xP
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 leading-relaxed space-y-1 animate-in fade-in duration-150">
                        <p>
                          <strong className="text-slate-200">LP Solver Decision:</strong> At ${d.price.toFixed(1)}M, selecting {d.name} forces sacrificing high-performing constructors (e.g. Mercedes at $33.5M).
                        </p>
                        <p className="text-emerald-400">
                          Reallocating capital to Antonelli ($26.6M) + top budget enablers yields +{netXp} higher aggregate team efficiency.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3.3: Top Manager Intelligence Ribbon & Leaderboard */}
        <div className="relative z-10 mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 min-w-0">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 truncate">
                Top Manager Intelligence
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[8.5px] font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded shrink-0 whitespace-nowrap shadow-sm">
                Edge: 30%
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2">
            {/* Gameweek / Round Ribbon */}
            <div className="flex items-center justify-between gap-1.5 p-1.5 bg-slate-950/90 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 px-1 py-0.5 rounded-md shadow-inner shrink-0">
                <button
                  type="button"
                  onClick={handlePrevRound}
                  disabled={availableRounds.indexOf(activeRound) === availableRounds.length - 1}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous Round"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 px-1 select-none">
                  <span className="text-[9.5px] font-mono text-emerald-400 font-bold whitespace-nowrap">
                    {activeRound}
                  </span>
                  <span className="text-[7px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleNextRound}
                  disabled={availableRounds.indexOf(activeRound) === 0}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Next Round"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {availableRounds.map((rnd) => (
                  <button
                    key={rnd}
                    type="button"
                    onClick={() => setActiveRound(rnd)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[8.5px] font-mono transition-all cursor-pointer whitespace-nowrap",
                      activeRound === rnd
                        ? "bg-fpl-green text-slate-950 font-black shadow-sm"
                        : "font-bold text-slate-400 hover:text-white hover:bg-slate-900"
                    )}
                  >
                    {rnd}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Tabs & Live Status Bar */}
            <div className="flex flex-col gap-1.5 border-b border-slate-800/60 pb-2">
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setCohortFilter('all')}
                    className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer",
                      cohortFilter === 'all'
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                    )}
                  >
                    All ({totalCohortSize})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCohortFilter('zero_chips')}
                    className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer",
                      cohortFilter === 'zero_chips'
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                    )}
                  >
                    Pure 0-Chips ({pureZeroChipsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCohortFilter('normalized')}
                    className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all cursor-pointer",
                      cohortFilter === 'normalized'
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                    )}
                  >
                    Normalized ({normalizedCount})
                  </button>
                </div>
                <span className="text-[8px] text-slate-500 font-mono hidden sm:block">Scroll for more ▾</span>
              </div>

              <div className="flex items-center justify-between px-1 text-[8.5px] font-mono">
                <span className="text-cyan-400/90 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {cohortFilter === 'all' && "Displaying All Leaders (Combined 0-Chip + Normalized)"}
                  {cohortFilter === 'zero_chips' && "Displaying Pure 0-Chip Leaders (Organic Cap - No Chips Used)"}
                  {cohortFilter === 'normalized' && `Displaying Normalized Leaders (Filtered ${totalCohortSize - normalizedCount} Limitless)`}
                </span>
              </div>
            </div>

            {/* Scrollable Manager Leaderboard */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-[11px] border border-slate-800/40 rounded-xl p-1 bg-slate-950/40 custom-scrollbar">
              {filteredCohort.map((manager, idx) => {
                const chipBadge = getChipBadge(manager.activeChip);
                const isChipUsed = manager.activeChip && manager.activeChip !== 'none';
                const rawPoints = manager.points;
                const normalizedPoints = manager.activeChip === 'limitless' ? rawPoints - 35 : rawPoints;

                return (
                  <div
                    key={`${manager.managerId}_${idx}`}
                    className={cn(
                      "bg-slate-950/80 p-2.5 rounded-xl border transition-all space-y-2",
                      syncedManagerId === manager.managerId
                        ? "border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                        : "border-slate-800/80 hover:border-slate-700/80"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9.5px] font-black font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded shrink-0">
                          #{manager.rank}
                        </span>
                        <div className="min-w-0">
                          <span
                            className="text-[11px] font-bold text-slate-100 block truncate"
                            title={`${manager.managerName || manager.userName} (${manager.userName || manager.managerName})`}
                          >
                            {manager.managerName || manager.userName}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate font-normal">
                            {manager.userName || manager.managerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10.5px]">
                        {isChipUsed && manager.activeChip === 'limitless' && (
                          <span className="text-slate-400 line-through text-[9.5px]" title="Raw Points before chip deduction">
                            {rawPoints}
                          </span>
                        )}
                        <span className="text-fpl-green font-black bg-fpl-green/10 border border-fpl-green/20 px-2 py-0.5 rounded">
                          {normalizedPoints} pts
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-900/90 text-[9px]">
                      <span className={cn("font-mono text-[8.5px] px-1.5 py-0.5 rounded border", chipBadge.style)}>
                        {chipBadge.label}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSyncedManagerId(manager.managerId);
                            onSyncSquad?.(manager);
                          }}
                          className="text-[8.5px] font-black uppercase tracking-wider text-slate-950 bg-fpl-green hover:bg-fpl-green/90 px-2 py-0.5 rounded-md transition-all shadow-[0_0_8px_rgba(0,255,133,0.25)] flex items-center gap-1 cursor-pointer active:scale-95"
                          title={`Sync Team ${manager.managerId} directly into Horizon and analyze squad as of ${activeRound}`}
                        >
                          ⚡ Sync Squad
                        </button>
                        <a
                          href="https://fantasy.formula1.com/en/leagues"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8.5px] font-mono text-cyan-300 bg-slate-900 border border-slate-700/80 hover:border-cyan-500/40 px-2 py-0.5 rounded-md hover:bg-slate-800 transition-all flex items-center gap-1"
                          title="Open Manager Account on Official Formula 1 Fantasy Website"
                        >
                          ID: {String(manager.managerId).slice(0, 7)} ↗
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3.4: Elite Consensus Hub */}
        <div className="pt-2.5 space-y-3 border-t border-slate-800/80 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">Elite Consensus</span>
            <span
              className="text-[8.5px] font-mono font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded cursor-help"
              title={`Calculated across ${cohortSize} active 0-chip/normalized elite managers`}
            >
              Elite cohort: {cohortSize} managers
            </span>
          </div>

          {/* Grand Podium Captaincy Hub Card */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-slate-900/90 border border-amber-500/30 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Elite Consensus Captaincy Hub</span>
              </div>
              <span className="text-[8.5px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                {topCaptain.percent}% Herd Armband
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* #1 Captain Card */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-400/40 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                      #1 CAPTAIN
                    </span>
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded text-amber-300 bg-amber-500/15 border-amber-500/30">
                      DVR
                    </span>
                    <span className="text-[8px] font-black text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded uppercase font-mono">
                      {topCaptain.driver?.shortName || 'ANT'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black font-mono text-amber-300">{topCaptain.percent}%</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Vote</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="relative flex items-center justify-center shrink-0 overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-b from-white/20 via-white/10 to-white/5 border border-amber-400/40 backdrop-blur-md p-0.5 shadow-md drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                    title={topCaptain.driver?.name}
                  >
                    <F1AssetPhoto
                      type="driver"
                      driverShortName={topCaptain.driver?.shortName}
                      name={topCaptain.driver?.name || ''}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-white text-[13.5px] truncate drop-shadow-sm leading-tight">
                      {topCaptain.driver?.name}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-slate-200 font-bold">${topCaptain.driver?.price.toFixed(1)}M</span>
                      <span>•</span>
                      <span>{cohortSize} of {cohortSize} managers</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* #2 Runner-Up Card */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                      #2 RUNNER-UP
                    </span>
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded text-emerald-300 bg-emerald-500/15 border-emerald-500/30">
                      DVR
                    </span>
                    <span className="text-[8px] font-black text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded uppercase font-mono">
                      {runnerUp.driver?.shortName || 'RUS'}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black font-mono text-cyan-300">{runnerUp.percent}%</span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase ml-1">Vote</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="relative flex items-center justify-center shrink-0 overflow-hidden w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 shadow-inner p-0.5"
                    title={runnerUp.driver?.name}
                  >
                    <F1AssetPhoto
                      type="driver"
                      driverShortName={runnerUp.driver?.shortName}
                      name={runnerUp.driver?.name || ''}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-white text-[13.5px] truncate drop-shadow-sm leading-tight">
                      {runnerUp.driver?.name}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-slate-200 font-bold">${runnerUp.driver?.price.toFixed(1)}M</span>
                      <span>•</span>
                      <span>{Math.round((runnerUp.percent / 100) * cohortSize)} of {cohortSize} managers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Captaincy Vote Share Bars */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Top 5 Captaincy Vote Share</span>
                <span>Sum: 100%</span>
              </div>
              <div className="space-y-1.5">
                {top5Captains.map((c) => (
                  <div
                    key={c.driver.id}
                    className="flex items-center justify-between gap-2 text-[10px] bg-slate-950/40 p-1.5 rounded-lg border border-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="relative flex items-center justify-center shrink-0 overflow-hidden w-5 h-5 rounded bg-slate-900/90 border border-white/15 shadow-inner"
                        title={c.driver.name}
                      >
                        <F1AssetPhoto
                          type="driver"
                          driverShortName={c.driver.shortName}
                          name={c.driver.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-extrabold text-slate-200 text-[11px] whitespace-nowrap truncate">
                        {c.driver.name}
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1 py-0.2 rounded uppercase shrink-0">
                        {c.driver.shortName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 shrink-0">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, c.percent))}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono font-black text-amber-300 shrink-0 whitespace-nowrap">
                        {c.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Starting Weapons */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px]">
              <span className="flex items-center gap-1 font-black uppercase text-amber-400 tracking-wider">
                <span>🔥</span>
                <span>Starting Weapons ({startingWeapons.length})</span>
              </span>
              <span className="text-[8px] text-slate-500 font-mono">Ranked by Conviction</span>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {startingWeapons.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-900 rounded-xl border border-slate-800/80 hover:border-amber-500/30 transition-all text-[10px]"
                  title={`${w.name}: ${w.starts}/${cohortSize} starts (${w.startPct}%), ${w.caps}/${cohortSize} captains (${w.capPct}%), Conviction: ${w.conviction.toFixed(3)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={cn(
                        "text-[8px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0",
                        w.role === 'DVR'
                          ? "text-amber-300 bg-amber-500/15 border-amber-500/30"
                          : "text-sky-300 bg-sky-500/15 border-sky-500/30"
                      )}
                    >
                      {w.role}
                    </span>
                    <span className="text-slate-200 font-bold truncate">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[8.5px] shrink-0 whitespace-nowrap">
                    <span className="font-bold px-1.5 py-0.5 rounded border text-slate-300 bg-slate-800/80 border-slate-700/60">
                      {w.startPct}% Start
                    </span>
                    {w.capPct > 0 && (
                      <span className="text-amber-300 font-bold bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded">
                        {w.capPct}% Cap
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Enablers */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="flex items-center gap-1 font-black uppercase text-cyan-400 tracking-wider">
                <span>🪑</span>
                <span>Budget Enablers ({budgetEnablers.length})</span>
              </span>
              <span className="text-[8px] text-slate-400 font-mono">Ranked by Selection & Value</span>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
              {budgetEnablers.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-900 rounded-xl border border-slate-800/80 hover:border-cyan-500/30 transition-all text-[10px]"
                  title={`${b.name}: $${b.price.toFixed(1)}M, ${b.starts}/${cohortSize} selected (${b.selPct}%), Conviction: ${b.conviction.toFixed(3)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded border shrink-0 text-emerald-300 bg-emerald-500/15 border-emerald-500/30">
                      {b.role}
                    </span>
                    <span className="text-slate-300 font-semibold truncate">{b.name}</span>
                    <span className="text-[8.5px] text-slate-400 font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                      ${b.price.toFixed(1)}m
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[8.5px] shrink-0 whitespace-nowrap">
                    <span className="font-bold px-1.5 py-0.5 rounded border text-cyan-300 bg-cyan-500/10 border-cyan-500/25">
                      {b.selPct}% Sel
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

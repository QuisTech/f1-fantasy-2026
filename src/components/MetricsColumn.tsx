import React from 'react';
import { Star, Cpu, Target, Users, Zap, TrendingDown, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Driver, UserLineup } from '../types/f1';
import eliteCohortData from '../data/eliteCohort.json';

interface MetricsColumnProps {
  userLineup: UserLineup;
  drivers: Driver[];
  riskMode: 'safe' | 'aggressive' | 'value';
}

export const MetricsColumn: React.FC<MetricsColumnProps> = ({
  userLineup,
  drivers,
  riskMode,
}) => {
  const drsDriver = drivers.find((d) => d.id === userLineup.drsBoostDriverId) || drivers[0];

  // 1. Engine Diagnostics Math
  const totalRosterPoints = userLineup.totalExpectedPoints;
  const multiWeekProjection = (totalRosterPoints * 3).toFixed(1); // 3-race projection

  // 2. Elite Consensus & EO Math
  const cohortSize = eliteCohortData.length;
  
  // Calculate ownership percentages for all drivers in the elite cohort
  const ownershipMap: Record<string, number> = {};
  const captainVotes: Record<string, number> = {};
  
  eliteCohortData.forEach(manager => {
    manager.drivers.forEach((d: any) => {
      const dId = d.id || d;
      ownershipMap[dId] = (ownershipMap[dId] || 0) + 1;
    });
    if (manager.captainId) {
      captainVotes[manager.captainId] = (captainVotes[manager.captainId] || 0) + 1;
    }
  });

  const driversWithEO = drivers.map(d => {
    const picks = ownershipMap[d.id] || 0;
    const eo = cohortSize > 0 ? (picks / cohortSize) * 100 : 0;
    return { ...d, eo, picks };
  });

  let sumRosterEO = 0;
  userLineup.driverIds.forEach(id => {
    sumRosterEO += ownershipMap[id] ? (ownershipMap[id] / cohortSize) * 100 : 0;
  });
  userLineup.constructorIds.forEach(id => {
    sumRosterEO += ownershipMap[id] ? (ownershipMap[id] / cohortSize) * 100 : 0;
  });
  const avgRosterEO = ((sumRosterEO / 7) || 0).toFixed(1);

  // 3. Omitted Template Stars
  const userSelectedSet = new Set([...userLineup.driverIds, ...userLineup.constructorIds]);
  const omittedStars = driversWithEO
    .filter(d => !userSelectedSet.has(d.id) && d.eo >= 30)
    .sort((a, b) => b.eo - a.eo);

  // 4. Elite Consensus Hub
  const sortedCaptains = Object.entries(captainVotes)
    .sort(([,a], [,b]) => b - a)
    .map(([id, votes]) => {
      const d = drivers.find(drv => drv.id === id);
      return { driver: d, percent: Math.round((votes / cohortSize) * 100) };
    })
    .filter(c => c.driver);

  const startingWeapons = [...driversWithEO]
    .filter(d => d.price >= 15.0)
    .sort((a, b) => b.eo - a.eo)
    .slice(0, 5);

  const budgetEnablers = [...driversWithEO]
    .filter(d => d.price < 15.0)
    .sort((a, b) => b.eo - a.eo)
    .slice(0, 5);

  return (
    <div className="col-span-12 lg:col-span-3 grid grid-cols-1 gap-4">
      {/* Squad Metrics Card */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col justify-between shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Squad Budget Value</h2>
          <span className="text-fpl-green text-[10px] font-bold">MY LINEUP</span>
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

      {/* Top 2x DRS Driver Recommendation Card */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DRS Pick (2×)</h2>
          <span className="text-[9px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            🏎️ {drsDriver.ownership || 0}% EO
          </span>
        </div>

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
            <p className="text-[9.5px] text-emerald-400 font-bold">Optimal DRS Boost</p>
          </div>
        </div>
      </div>

      {/* Engine Diagnostics */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm mt-2">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Engine Diagnostics</span>
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">LP Solver Optimal</span>
            <span className="font-mono text-cyan-400 font-bold">Max xP + Cap 2×</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Constraint: Budget</span>
            <span className="font-mono text-white font-bold">
              ${userLineup.totalCost.toFixed(1)}M <span className="text-slate-500">/ $100.0M</span>
            </span>
          </div>
          
          <div className="pt-3 border-t border-fpl-border flex justify-between items-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">3-Race Projected xP</div>
              <div className="text-xl font-black text-white">{multiWeekProjection} pts</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Average Roster EO</div>
              <div className="text-xl font-black text-amber-400">{avgRosterEO}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Omitted Template Stars */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-fpl-green" />
          <span>Omitted Template Stars</span>
        </h2>

        <div className="space-y-3">
          {omittedStars.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No template stars omitted.</div>
          ) : (
            omittedStars.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{d.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-mono">
                    ${d.price.toFixed(1)}M • {d.eo.toFixed(1)}% EO
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    -{Math.max(1, (d.price * 1.5 - d.xP)).toFixed(1)} xP
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Top Manager Intelligence */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-fpl-purple" />
            <span>Top Manager Intelligence</span>
          </div>
          <span className="bg-fpl-purple/10 text-fpl-purple px-1.5 py-0.5 rounded text-[9px]">Edge: 30%</span>
        </h2>

        <div className="max-h-[180px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {eliteCohortData.map((manager) => (
            <div key={manager.managerId} className="flex items-center justify-between p-2.5 bg-slate-900/50 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-300">#{manager.rank}</span>
                  <span className="text-xs font-bold text-white truncate max-w-[100px]">{manager.managerName}</span>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                  {manager.points} pts {manager.activeChip ? `• ${manager.activeChip}` : ''}
                </div>
              </div>
              <button className="text-[9px] font-bold bg-fpl-purple/10 hover:bg-fpl-purple/20 text-fpl-purple border border-fpl-purple/30 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                <Zap className="w-2.5 h-2.5" /> SYNC
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Elite Consensus Hub */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Elite Consensus Hub</span>
          </div>
          <span className="text-[9px] text-slate-500">N={cohortSize}</span>
        </h2>

        {sortedCaptains.length > 0 && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
            <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mb-2">#1 Captain Choice</div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-white">{sortedCaptains[0].driver?.name}</span>
              <span className="text-xs font-mono font-bold text-amber-400">{sortedCaptains[0].percent}% Vote</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
              🔥 Starting Weapons
            </div>
            <div className="space-y-1.5">
              {startingWeapons.slice(0,3).map(d => (
                <div key={d.id} className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{d.shortName || d.name}</span>
                  <span className="font-mono text-cyan-400 font-bold">{d.eo.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
              🪑 Budget Enablers
            </div>
            <div className="space-y-1.5">
              {budgetEnablers.slice(0,3).map(d => (
                <div key={d.id} className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{d.shortName || d.name}</span>
                  <span className="font-mono text-emerald-400 font-bold">{d.eo.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { Driver, Circuit, UserLineup } from '../types/f1';
import { Trophy, Cpu, Target, Users, Zap, TrendingDown } from 'lucide-react';
import eliteCohortData from '../data/eliteCohort.json';

interface RightColumnProps {
  drivers: Driver[];
  circuit: Circuit;
  userLineup: UserLineup;
}

export const RightColumn: React.FC<RightColumnProps> = ({ drivers, userLineup }) => {
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

  // Attach EO to full driver list
  const driversWithEO = drivers.map(d => {
    const picks = ownershipMap[d.id] || 0;
    const eo = cohortSize > 0 ? (picks / cohortSize) * 100 : 0;
    return { ...d, eo, picks };
  });

  // Calculate Average Roster EO for current user lineup
  let sumRosterEO = 0;
  userLineup.driverIds.forEach(id => {
    sumRosterEO += ownershipMap[id] ? (ownershipMap[id] / cohortSize) * 100 : 0;
  });
  userLineup.constructorIds.forEach(id => {
    sumRosterEO += ownershipMap[id] ? (ownershipMap[id] / cohortSize) * 100 : 0;
  });
  const avgRosterEO = ((sumRosterEO / 7) || 0).toFixed(1);

  // 3. Omitted Template Stars (High EO, but not in user's team)
  const userSelectedSet = new Set([...userLineup.driverIds, ...userLineup.constructorIds]);
  const omittedStars = driversWithEO
    .filter(d => !userSelectedSet.has(d.id) && d.eo >= 30) // Template is > 30% EO
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
    .filter(d => d.price >= 15.0) // Premiums
    .sort((a, b) => b.eo - a.eo)
    .slice(0, 5);

  const budgetEnablers = [...driversWithEO]
    .filter(d => d.price < 15.0) // Budget
    .sort((a, b) => b.eo - a.eo)
    .slice(0, 5);

  return (
    <div className="col-span-12 lg:col-span-3 grid grid-cols-1 gap-4">
      {/* Engine Diagnostics */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
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
        
        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
          Why did the solver reject these highly-owned drivers from the global optimum path?
        </p>

        <div className="space-y-3">
          {omittedStars.length === 0 ? (
            <div className="text-xs text-slate-400 italic">No template stars omitted. Your lineup matches the consensus.</div>
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
                    -{Math.max(1, (d.price * 1.5 - d.xP)).toFixed(1)} net xP
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

import React from 'react';
import type { Driver, Constructor } from '../types/f1';
import { MOCK_RIVALS } from '../data/f1Data';
import { Users, Wrench } from 'lucide-react';

interface RivalSpyProps {
  drivers: Driver[];
  constructors: Constructor[];
}

export const RivalSpy: React.FC<RivalSpyProps> = ({ drivers }) => {
  const topOwnedDrivers = [...drivers].sort((a, b) => b.ownership - a.ownership);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full">
      {/* Left Rival Mini-League Spy */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="bg-card-bg border border-fpl-border rounded-2xl p-4 md:p-5 shadow-sm">
          <h2 className="text-sm font-extrabold flex flex-wrap items-center gap-2 mb-2 text-white">
            <span className="text-amber-400">🏆 MINI-LEAGUE RIVAL SPY & CHIP TRACKER</span>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
              TOP RIVALS
            </span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Track rival manager lineups, DRS Boost assignments, and active chip usages (e.g., who used Final Fix or 3x Mega DRS).
          </p>
        </div>

        {/* Rival Cards */}
        <div className="space-y-4">
          {MOCK_RIVALS.map((rival) => {
            const drsDriver = drivers.find((d) => d.id === rival.drsBoost);

            return (
              <div key={rival.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-md space-y-4 hover:border-slate-700 transition-all">
                <div className="flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-f1-red to-red-700 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg shadow-red-500/20 shrink-0">
                      #{rival.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm md:text-base text-white truncate">{rival.teamName}</div>
                      <div className="text-xs text-slate-400 truncate">Manager: <span className="font-medium text-slate-300">{rival.managerName}</span></div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 w-full sm:w-auto bg-slate-950/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-slate-800/50">
                    <div className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-wider">TOTAL POINTS</div>
                    <div className="text-lg font-mono font-black text-cyan-400">
                      {rival.totalPoints} pts
                    </div>
                  </div>
                </div>

                {/* Chips & Stats Row */}
                <div className="flex flex-wrap items-center bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono gap-3 md:gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">DRS Boost</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {drsDriver?.name || 'VER'} <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px]">2X</span>
                    </span>
                  </div>

                  <div className="hidden sm:block w-px h-8 bg-slate-800"></div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Active Chip</span>
                    <div className="flex items-center h-[22px]">
                      {rival.activeChip ? (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{rival.activeChip.replace('_', ' ')}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">None</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="hidden sm:block w-px h-8 bg-slate-800"></div>

                  <div className="flex-1 flex justify-end">
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Users className="w-3 h-3 shrink-0" />
                      {rival.diffCount} Differentials vs You
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Effective Ownership (EO) Table */}
      <div className="lg:col-span-4 bg-card-bg border border-fpl-border rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>EFFECTIVE OWNERSHIP (`EO`)</span>
        </h3>

        <div className="space-y-2">
          {topOwnedDrivers.slice(0, 10).map((d) => (
            <div
              key={d.id}
              className="flex justify-between items-center text-xs font-mono p-2.5 bg-slate-950/60 rounded-xl border border-slate-900 gap-3 hover:border-slate-800 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold text-white truncate text-sm">{d.name}</div>
                <div className="text-[10px] text-slate-500 truncate uppercase tracking-wider">{d.teamName}</div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-cyan-400 tabular-nums">{d.ownership.toFixed(1)}% <span className="text-[10px] text-slate-500">EO</span></div>
                <div className="text-[10px] text-amber-400 tabular-nums">{d.drsOwnership.toFixed(1)}% <span className="text-[9px] text-slate-500">DRS</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

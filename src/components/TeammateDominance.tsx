import React from 'react';
import type { Driver, Constructor } from '../types/f1';
import { Award, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface TeammateDominanceProps {
  drivers: Driver[];
  constructors: Constructor[];
}

export const TeammateDominance: React.FC<TeammateDominanceProps> = ({
  drivers,
  constructors,
}) => {
  return (
    <div className="flex flex-col space-y-6 w-full">
      {/* Explanation Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <h2 className="text-lg font-black flex flex-wrap items-center gap-3 mb-2 text-white relative z-10">
          <span className="text-cyan-400">📊 TEAMMATE DOMINANCE INDEX</span>
          <span className="bg-slate-800/80 text-slate-300 border border-slate-700 text-[10px] font-mono px-2.5 py-1 rounded-lg uppercase tracking-widest">
            H2H Advanced Metrics
          </span>
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-3xl relative z-10">
          Your teammate is your only true baseline in identical machinery. 
          The <strong className="text-slate-200">TDI</strong> isolates pure driver talent from car advantage, while <strong className="text-slate-200">ORP</strong> quantifies position recovery potential.
        </p>
      </div>

      {/* Head-to-Head Rows */}
      <div className="flex flex-col space-y-4">
        {constructors.map((team) => {
          const d1 = drivers.find((d) => d.id === team.driver1Id);
          const d2 = drivers.find((d) => d.id === team.driver2Id);

          if (!d1 || !d2) return null;

          const isD1Dominant = d1.tdi >= d2.tdi;

          return (
            <div
              key={team.id}
              className="bg-card-bg border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
            >
              {/* Team Header */}
              <div 
                className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3"
                style={{ borderTop: `4px solid ${team.color}` }}
              >
                <div className="font-black text-base text-white tracking-wide uppercase">{team.name}</div>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                    <span>Avg Pit:</span>
                    <strong className="text-white">{team.avgPitStopSec}s</strong>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                    <span>Pit xP:</span>
                    <strong className="text-fpl-green">+{team.xPitPoints.toFixed(1)}</strong>
                  </div>
                </div>
              </div>

              {/* H2H Body */}
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center relative">
                
                {/* Driver 1 (Left Side) */}
                <div className={cn(
                  "flex flex-col space-y-3 p-4 rounded-xl border transition-all md:text-right",
                  isD1Dominant ? "bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.03)]" : "bg-slate-950/30 border-slate-800/50 opacity-80"
                )}>
                  <div className="flex flex-row md:flex-row-reverse justify-between md:justify-start items-center gap-3">
                    <span className="font-black text-lg text-white">{d1.name}</span>
                    {isD1Dominant && <Award className="w-5 h-5 text-amber-400 drop-shadow-md shrink-0" />}
                  </div>
                  <div className="text-xs text-slate-400 font-mono flex flex-row md:flex-row-reverse gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">Grid P{d1.gridPosition}</span>
                    <span className="text-cyan-400 font-bold">${d1.price.toFixed(1)}M</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Quali Delta</span>
                      <span className={`text-sm font-black tabular-nums ${d1.headToHeadVsTeammate.qualiDeltaSeconds <= 0 ? 'text-fpl-green' : 'text-red-400'}`}>
                        {d1.headToHeadVsTeammate.qualiDeltaSeconds > 0 ? '+' : ''}{d1.headToHeadVsTeammate.qualiDeltaSeconds.toFixed(3)}s
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">TDI Score</span>
                      <span className="text-sm font-black text-cyan-400 tabular-nums">{d1.tdi.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">ORP Bonus</span>
                      <span className="text-sm font-black text-amber-400 tabular-nums">+{d1.orp.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* VS Badge (Center) */}
                <div className="hidden md:flex flex-col items-center justify-center shrink-0 z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center shadow-lg">
                    <Zap className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Driver 2 (Right Side) */}
                <div className={cn(
                  "flex flex-col space-y-3 p-4 rounded-xl border transition-all text-left",
                  !isD1Dominant ? "bg-cyan-500/5 border-cyan-500/20 shadow-[0_0_20px_rgba(0,240,255,0.03)]" : "bg-slate-950/30 border-slate-800/50 opacity-80"
                )}>
                  <div className="flex flex-row justify-between md:justify-start items-center gap-3">
                    <span className="font-black text-lg text-white">{d2.name}</span>
                    {!isD1Dominant && <Award className="w-5 h-5 text-amber-400 drop-shadow-md shrink-0" />}
                  </div>
                  <div className="text-xs text-slate-400 font-mono flex flex-row gap-2">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-200">Grid P{d2.gridPosition}</span>
                    <span className="text-cyan-400 font-bold">${d2.price.toFixed(1)}M</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Quali Delta</span>
                      <span className={`text-sm font-black tabular-nums ${d2.headToHeadVsTeammate.qualiDeltaSeconds <= 0 ? 'text-fpl-green' : 'text-red-400'}`}>
                        {d2.headToHeadVsTeammate.qualiDeltaSeconds > 0 ? '+' : ''}{d2.headToHeadVsTeammate.qualiDeltaSeconds.toFixed(3)}s
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">TDI Score</span>
                      <span className="text-sm font-black text-cyan-400 tabular-nums">{d2.tdi.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">ORP Bonus</span>
                      <span className="text-sm font-black text-amber-400 tabular-nums">+{d2.orp.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Network, ArrowRightLeft, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import type { Driver, Constructor, UserLineup, Circuit } from '../types/f1';
import { beamSearchMultiWeek } from '../utils/quantEngine';
import type { GameweekState } from '../utils/quantEngine';
import { optimizeLineup } from '../utils/optimizer';

interface Props {
  drivers: Driver[];
  constructors: Constructor[];
  userLineup: UserLineup;
  calendar: Circuit[];
  strategyMode?: 'safe' | 'aggressive' | 'value';
  onApplySquad?: (driverIds: string[], constructorIds: string[], drsId: string) => void;
}

export const MultiWeekPlanner: React.FC<Props> = ({ drivers, constructors, userLineup, calendar, strategyMode = 'safe', onApplySquad }) => {
  const [horizon, setHorizon] = useState(3);
  const [isCalculating, setIsCalculating] = useState(false);
  const [bestPath, setBestPath] = useState<GameweekState | null>(null);

  // We only look at the next 'horizon' races
  const upcomingRaces = useMemo(() => {
    const now = new Date();
    // In our mock, if all dates are past, we just take the last 'horizon' races
    let futureRaces = calendar.filter(c => c.date ? new Date(c.date) > now : false);
    if (futureRaces.length === 0) {
      futureRaces = calendar.slice(-horizon);
    } else {
      futureRaces = futureRaces.slice(0, horizon);
    }
    return futureRaces;
  }, [calendar, horizon]);

  useEffect(() => {
    if (!userLineup || drivers.length === 0 || constructors.length === 0) return;
    
    setIsCalculating(true);
    
    // Use setTimeout to allow UI to render the 'Calculating...' state before blocking the main thread
    const timer = setTimeout(() => {
      const result = beamSearchMultiWeek(userLineup, drivers, constructors, upcomingRaces, 10, [], [], strategyMode);
      setBestPath(result);
      setIsCalculating(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [userLineup, drivers, constructors, upcomingRaces, strategyMode]);

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 p-4 sm:p-6 mb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-fpl-purple" />
            Quant Engine: Beam Search Pathfinding
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Running 1,000 Monte Carlo weather/chaos simulations per gameweek to find the optimal transfer sequence.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-400 px-2">Horizon:</span>
          {[2, 3, 5].map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${horizon === h ? 'bg-fpl-purple text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {h} Races
            </button>
          ))}
        </div>
      </div>

      {isCalculating ? (
        <div className="h-64 flex flex-col items-center justify-center border border-slate-800 border-dashed rounded-xl bg-slate-900/50">
          <div className="w-8 h-8 border-4 border-fpl-purple border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-medium text-slate-300 animate-pulse">Running Monte Carlo Simulations...</p>
        </div>
      ) : bestPath ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Timeline Col */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Transfer Timeline</h3>
            
            {bestPath.pathHistory.map((step, idx) => {
              const stepDetail = bestPath.pathSteps?.[idx];
              const isHold = step.includes('Hold Lineup');
              const isWildcard = Boolean(stepDetail?.isWildcard || step.toLowerCase().includes('wildcard'));
              const isPenalty = step.includes('Expected') && bestPath.transferPenaltiesTotal > 0 && !isHold && idx > 0;
              
              let stepDrivers = stepDetail ? drivers.filter(d => stepDetail.driverIds.map(String).includes(String(d.id))) : [];
              let stepConstructors = stepDetail ? constructors.filter(c => stepDetail.constructorIds.map(String).includes(String(c.id))) : [];
              let drsBoostId = stepDetail?.drsBoostDriverId;

              // Fallback: If wildcard step, ensure full lineup is resolved even if stepDetail had mismatched IDs
              if (isWildcard && (stepDrivers.length === 0 || stepConstructors.length === 0)) {
                const budget = userLineup.teamValue > 0 ? userLineup.teamValue : 100.0;
                const opt = optimizeLineup(drivers, constructors, budget, [], [], strategyMode);
                if (opt) {
                  stepDrivers = opt.drivers;
                  stepConstructors = opt.constructors;
                  drsBoostId = opt.drsBoostDriver.id;
                }
              }

              return (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Timeline Line */}
                  {idx !== bestPath.pathHistory.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-slate-800"></div>
                  )}
                  
                  {/* Node */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10 
                    ${isWildcard ? 'bg-amber-500/20 border-amber-500 text-amber-400' : isHold ? 'bg-slate-900 border-slate-700' : isPenalty ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-fpl-purple/20 border-fpl-purple text-fpl-purple'}`}
                  >
                    {isWildcard ? <Zap className="w-4 h-4 text-amber-400" /> : isHold ? <ShieldCheck className="w-4 h-4 text-slate-400" /> : <ArrowRightLeft className="w-4 h-4" />}
                  </div>
                  
                  {/* Content */}
                  <div className={`flex-1 p-4 rounded-xl border ${isWildcard ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5' : isHold ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-fpl-purple/30'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">GW {idx + 1}</span>
                        {isWildcard && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                            🃏 WILDCARD CHIP
                          </span>
                        )}
                      </div>
                      {upcomingRaces[idx] && (
                        <span className="text-[10px] uppercase text-slate-400 font-mono flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {upcomingRaces[idx].rainProbability}% Rain Risk
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm font-semibold ${isWildcard ? 'text-amber-200' : isHold ? 'text-slate-400' : 'text-slate-200'} mt-1`}>
                      {step}
                    </p>

                    {/* If Wildcard, render full roster breakdown & 1-click apply button */}
                    {isWildcard && stepDrivers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2.5">
                        <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                          <span>Wildcard Suggested Squad</span>
                          <span className="font-mono text-[10px] text-amber-400/80">
                            Cost: ${(stepDrivers.reduce((s,d)=>s+d.price,0) + stepConstructors.reduce((s,c)=>s+c.price,0)).toFixed(1)}M
                          </span>
                        </div>

                        {/* Constructors */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase w-14 shrink-0">Teams:</span>
                          {stepConstructors.map(c => (
                            <span key={c.id} className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800/90 text-white border border-slate-700 flex items-center gap-1">
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">${c.price}M</span>
                            </span>
                          ))}
                        </div>

                        {/* Drivers */}
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase w-14 shrink-0">Drivers:</span>
                          {stepDrivers.map(d => {
                            const isDrs = String(d.id) === String(drsBoostId);
                            return (
                              <span
                                key={d.id}
                                className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                                  isDrs
                                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                                    : 'bg-slate-800/90 text-slate-200 border-slate-700'
                                }`}
                              >
                                <span>{d.name} ({d.shortName})</span>
                                <span className="text-[10px] text-slate-400 font-mono">${d.price}M</span>
                                {isDrs && (
                                  <span className="text-[9px] font-black px-1 py-0.2 rounded bg-amber-400 text-slate-950">
                                    2X DRS
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>

                        {/* 1-Click Load into Paddock Grid */}
                        {onApplySquad && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onApplySquad(
                                stepDrivers.map(d => String(d.id)),
                                stepConstructors.map(c => String(c.id)),
                                String(drsBoostId || stepDrivers[0]?.id || '')
                              )}
                              className="px-3 py-1.5 rounded-lg bg-fpl-green hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,133,0.3)] transition-all cursor-pointer active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 fill-slate-950" />
                              <span>Load Wildcard to Paddock Grid</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metrics Col */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Trajectory Analysis</h3>
            
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp className="w-24 h-24 text-fpl-green" />
              </div>
              
              <div className="relative z-10">
                <span className="text-xs font-medium text-slate-400">Total Projected xP</span>
                <div className="flex items-baseline gap-2 mt-1 mb-6">
                  <span className="text-4xl font-black text-fpl-green">+{bestPath.cumulativeXP.toFixed(1)}</span>
                  <span className="text-sm font-bold text-slate-500">pts</span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Sequence Horizon</span>
                    <span className="text-xs font-bold text-white">{horizon} Races</span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Transfers Used</span>
                    <span className="text-xs font-bold text-white">{bestPath.transfersUsedTotal}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Point Penalties</span>
                    <span className={`text-xs font-bold ${bestPath.transferPenaltiesTotal > 0 ? 'text-red-400' : 'text-fpl-green'}`}>
                      -{bestPath.transferPenaltiesTotal} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-900/50 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/80 leading-relaxed">
                <strong className="text-amber-500">Notice:</strong> The engine automatically accounts for negative point penalties in its sequence solver. If a transfer is recommended, the risk-adjusted xP gain mathematically offsets the penalty.
              </p>
            </div>
            
          </div>
        </div>
      ) : null}
      
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Network, ArrowRightLeft, TrendingUp, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import type { Driver, Constructor, UserLineup, Circuit } from '../types/f1';
import { beamSearchMultiWeek } from '../utils/quantEngine';
import type { GameweekState } from '../utils/quantEngine';

interface Props {
  drivers: Driver[];
  constructors: Constructor[];
  userLineup: UserLineup;
  calendar: Circuit[];
  strategyMode?: 'safe' | 'aggressive' | 'value';
}

export const MultiWeekPlanner: React.FC<Props> = ({ drivers, constructors, userLineup, calendar, strategyMode = 'safe' }) => {
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
              const isHold = step.includes('Hold Lineup');
              const isPenalty = step.includes('Expected') && bestPath.transferPenaltiesTotal > 0 && !isHold && idx > 0; // naive flag for visual
              
              return (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Timeline Line */}
                  {idx !== bestPath.pathHistory.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-[-16px] w-0.5 bg-slate-800"></div>
                  )}
                  
                  {/* Node */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 z-10 
                    ${isHold ? 'bg-slate-900 border-slate-700' : isPenalty ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-fpl-purple/20 border-fpl-purple text-fpl-purple'}`}
                  >
                    {isHold ? <ShieldCheck className="w-4 h-4 text-slate-400" /> : <ArrowRightLeft className="w-4 h-4" />}
                  </div>
                  
                  {/* Content */}
                  <div className={`flex-1 p-4 rounded-xl border ${isHold ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-900 border-fpl-purple/30'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">GW {idx + 1}</span>
                      {upcomingRaces[idx] && (
                        <span className="text-[10px] uppercase text-slate-400 font-mono flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {upcomingRaces[idx].rainProbability}% Rain Risk
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm font-medium ${isHold ? 'text-slate-400' : 'text-slate-200'} mt-2`}>
                      {step}
                    </p>
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

import React from 'react';
import type { Driver, Circuit } from '../types/f1';
import { Flag, Trophy } from 'lucide-react';

interface RightColumnProps {
  drivers: Driver[];
  circuit: Circuit;
}

export const RightColumn: React.FC<RightColumnProps> = ({ drivers, circuit }) => {
  // Calculate Points Per $M (PPM)
  const topValueDrivers = [...drivers]
    .map((d) => ({
      ...d,
      ppm: Number((d.xP / d.price).toFixed(2)),
    }))
    .sort((a, b) => b.ppm - a.ppm);

  return (
    <div className="col-span-12 lg:col-span-3 grid grid-cols-1 gap-4">
      {/* Top Value Picks Card (PPM) */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Top Value Drivers (PPM)</span>
        </h2>

        <div className="space-y-3 flex-grow">
          {topValueDrivers.slice(0, 5).map((d, i) => (
            <div
              key={d.id}
              className={`flex items-center justify-between border-b border-fpl-border pb-2 ${
                i >= 4 ? 'border-0' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{d.name}</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono">
                  Grid P{d.gridPosition} | ${d.price.toFixed(1)}M
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-fpl-green">{d.ppm}</span>
                <div className="text-[8px] text-slate-500 uppercase font-bold">Pts/$M</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grand Prix Fixture & Track List */}
      <div className="bg-card-bg border border-fpl-border rounded-3xl p-5 flex flex-col shadow-sm">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upcoming Grand Prix Calendar</span>
        </h2>

        <div className="space-y-3">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-cyan-500/30">
            <div className="flex justify-between items-center text-xs font-bold text-white mb-1">
              <span>{circuit.grandPrixName}</span>
              <span className="text-cyan-400 font-mono text-[10px]">CURRENT GP</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex justify-between">
              <span>{circuit.name}</span>
              <span>SC Risk: {circuit.scProbability}%</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-2xl border border-fpl-border text-slate-400">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1">
              <span>Hungarian Grand Prix</span>
              <span className="text-slate-500 font-mono text-[10px]">NEXT GP</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Hungaroring</span>
              <span>SC Risk: 15%</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 rounded-2xl border border-fpl-border text-slate-400">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1">
              <span>Belgian Grand Prix</span>
              <span className="text-slate-500 font-mono text-[10px]">GP +2</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono flex justify-between">
              <span>Circuit de Spa-Francorchamps</span>
              <span>SC Risk: 80%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

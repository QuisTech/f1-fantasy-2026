import React from 'react';
import type { Driver, Circuit } from '../types/f1';
import { Flag, Trophy } from 'lucide-react';
import { F1_CALENDAR } from '../utils/harParser';
import { cn } from '../lib/utils';

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

  // Dynamically resolve upcoming circuits from F1_CALENDAR starting from current circuit
  const currIdx = F1_CALENDAR.findIndex(
    (c) => c.id === circuit.id || c.grandPrixName.toLowerCase() === circuit.grandPrixName.toLowerCase()
  );
  const startIdx = currIdx >= 0 ? currIdx : 0;
  const upcomingGps = F1_CALENDAR.slice(startIdx, startIdx + 3);

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
              <div>
                <div className="text-xs font-bold text-white">{d.name}</div>
                <span className="text-[9px] text-slate-400 font-mono">
                  ${d.price.toFixed(1)}M • {d.teamName}
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
          {upcomingGps.map((gp, idx) => {
            const isCurrent = idx === 0;
            const label = isCurrent ? 'CURRENT GP' : idx === 1 ? 'NEXT GP' : `GP +${idx}`;

            return (
              <div
                key={gp.id}
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  isCurrent
                    ? "bg-slate-950/80 border-cyan-500/40 shadow-sm"
                    : "bg-slate-950/40 border-fpl-border text-slate-400"
                )}
              >
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className={isCurrent ? "text-white font-extrabold" : "text-slate-300"}>
                    {gp.grandPrixName}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[9px] font-bold px-1.5 py-0.2 rounded uppercase",
                      isCurrent
                        ? "text-cyan-300 bg-cyan-500/15 border border-cyan-500/30"
                        : "text-slate-500"
                    )}
                  >
                    {label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex justify-between items-center">
                  <span>{gp.name}</span>
                  <span className="flex items-center gap-1.5">
                    <span>SC Risk: {gp.scProbability}%</span>
                    {gp.rainProbability && gp.rainProbability >= 30 ? (
                      <span className="text-sky-400 font-bold">🌧️ {gp.rainProbability}%</span>
                    ) : null}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

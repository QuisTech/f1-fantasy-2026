import React from 'react';
import { Star, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Driver, UserLineup } from '../types/f1';

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
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DRS Boost Pick (2×)</h2>
          <span className="text-[9px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            🏎️ {drsDriver.ownership}% EO
          </span>
        </div>

        {/* Optimal Pick */}
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
            <p className="text-[9.5px] text-emerald-400 font-bold">Optimal DRS Boost (2× Points)</p>
          </div>
        </div>

        {/* F1 Steep Transfer Penalty Alert */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 text-[10px] text-red-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-red-400 uppercase">F1 Transfer Rule:</strong> Extra transfers cost <span className="font-bold text-white">-10 pts</span> each. Save free transfers unless xP gain exceeds 10 points.
          </div>
        </div>
      </div>
    </div>
  );
};

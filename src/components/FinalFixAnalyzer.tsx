import React from 'react';
import type { Driver, UserLineup, FinalFixRecommendation } from '../types/f1';
import { calculateFinalFixRecommendations } from '../utils/optimizer';
import { Wrench, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface FinalFixAnalyzerProps {
  drivers: Driver[];
  userLineup: UserLineup;
  setUserLineup: React.Dispatch<React.SetStateAction<UserLineup>>;
}

export const FinalFixAnalyzer: React.FC<FinalFixAnalyzerProps> = ({
  drivers,
  userLineup,
  setUserLineup,
}) => {
  const recommendations = calculateFinalFixRecommendations(userLineup, drivers);

  const handleExecuteFix = (rec: FinalFixRecommendation) => {
    setUserLineup((prev) => {
      const updatedDrivers = prev.driverIds.filter((id) => id !== rec.currentDriver.id);
      updatedDrivers.push(rec.recommendedDriver.id);
      return {
        ...prev,
        driverIds: updatedDrivers,
        activeChip: 'final_fix',
      };
    });
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      {/* Top Banner */}
      <div className="bg-card-bg border border-amber-500/30 rounded-2xl p-4 border-l-4 border-l-amber-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 whitespace-nowrap">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase whitespace-nowrap">
              <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Final Fix Strategy Engine</span>
            </span>
            <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
              POST-QUALIFYING WINDOW ACTIVE
            </span>
          </div>
          <h2 className="text-base font-extrabold text-white whitespace-nowrap">
            Post-Qualifying Driver Swap Recommendations
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Swap 1 driver <strong>AFTER Qualifying completes</strong> without transfer penalties.
            F1-Admin identifies grid position anomalies to maximize expected points (`xP`).
          </p>
        </div>

        <div className="text-right whitespace-nowrap shrink-0">
          <div className="text-[10px] text-slate-400 font-mono uppercase font-bold whitespace-nowrap">Chip Status</div>
          <div className="text-sm font-mono font-black text-fpl-green whitespace-nowrap">AVAILABLE</div>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase text-cyan-400 flex items-center gap-1.5 tracking-wider whitespace-nowrap">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Top Recommended Final Fix Swaps ({recommendations.length} Found)</span>
        </h3>

        {recommendations.length === 0 ? (
          <div className="bg-card-bg border border-fpl-border rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-fpl-green mx-auto" />
            <h4 className="font-extrabold text-sm text-white">Lineup is Already Optimized Post-Qualifying!</h4>
            <p className="text-xs text-slate-400">
              No driver swap provides a statistically significant expected points (+xP) gain over your 5 drivers.
            </p>
          </div>
        ) : (
          recommendations.slice(0, 4).map((rec) => (
            <div
              key={`${rec.currentDriver.id}-${rec.recommendedDriver.id}`}
              className="bg-card-bg border border-fpl-border rounded-2xl p-4 space-y-3 shadow-lg hover:border-slate-700 transition-all"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Outgoing Driver */}
                <div className="md:col-span-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 space-y-1 whitespace-nowrap">
                  <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider whitespace-nowrap">
                    OUTGOING DRIVER (SELL)
                  </div>
                  <div className="text-sm font-black text-white whitespace-nowrap">{rec.currentDriver.name}</div>
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-2 whitespace-nowrap">
                    <span>Grid P{rec.currentDriver.gridPosition}</span>
                    <span>•</span>
                    <span>${rec.currentDriver.price.toFixed(1)}M</span>
                    <span>•</span>
                    <span className="text-red-400 font-bold">{rec.currentDriver.xP.toFixed(1)} xP</span>
                  </div>
                </div>

                {/* Arrow & Net Gain Badge */}
                <div className="md:col-span-3 flex flex-col items-center justify-center space-y-1 whitespace-nowrap">
                  <ArrowRight className="w-5 h-5 text-cyan-400 shrink-0" />
                  <span className="bg-fpl-green/15 text-fpl-green border border-fpl-green/30 text-xs font-mono font-black px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    +{rec.xPGain.toFixed(1)} xP GAIN
                  </span>
                </div>

                {/* Incoming Recommended Driver */}
                <div className="md:col-span-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-1 whitespace-nowrap">
                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap">
                    INCOMING TARGET (BUY)
                  </div>
                  <div className="text-sm font-black text-white whitespace-nowrap">{rec.recommendedDriver.name}</div>
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-2 whitespace-nowrap">
                    <span>Grid P{rec.recommendedDriver.gridPosition}</span>
                    <span>•</span>
                    <span>${rec.recommendedDriver.price.toFixed(1)}M</span>
                    <span>•</span>
                    <span className="text-fpl-green font-bold">+{rec.recommendedDriver.xP.toFixed(1)} xP</span>
                  </div>
                </div>

                {/* Execute Button */}
                <div className="md:col-span-2 flex justify-end shrink-0 whitespace-nowrap">
                  <button
                    onClick={() => handleExecuteFix(rec)}
                    className="bg-gradient-to-r from-f1-red to-red-700 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 uppercase hover:scale-105 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                    <span>Execute Fix</span>
                  </button>
                </div>

              </div>

              {/* Justification Footer */}
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap justify-between items-center gap-2 whitespace-nowrap">
                <span className="whitespace-nowrap">💡 <strong>Rationale:</strong> {rec.reason}</span>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded whitespace-nowrap">
                  {rec.gridDeltaImpact}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

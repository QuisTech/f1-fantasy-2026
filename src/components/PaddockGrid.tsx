import React from 'react';
import type { Driver, Constructor, UserLineup } from '../types/f1';
import { F1AssetPhoto } from './F1AssetPhoto';
import { Star, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaddockGridProps {
  drivers: Driver[];
  constructors: Constructor[];
  userLineup: UserLineup;
  setUserLineup: React.Dispatch<React.SetStateAction<UserLineup>>;
}

export const PaddockGrid: React.FC<PaddockGridProps> = ({
  drivers,
  constructors,
  userLineup,
  setUserLineup,
}) => {
  const selectedDrivers = drivers.filter((d) => userLineup.driverIds.includes(d.id));
  const selectedConstructors = constructors.filter((c) => userLineup.constructorIds.includes(c.id));
  const benchDrivers = drivers.filter((d) => !userLineup.driverIds.includes(d.id)).slice(0, 4);

  return (
    <div className="flex-grow flex flex-col justify-start space-y-4 py-2 w-full overflow-x-hidden">
      {/* Paddock Header Ribbon */}
      <div className="bg-slate-950/85 border border-fpl-border rounded-xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="bg-fpl-green/10 border border-fpl-green/30 text-fpl-green font-mono font-black text-xs px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fpl-green animate-pulse shrink-0" />
            <span>OFFICIAL F1 FANTASY PADDOCK</span>
          </span>
          <span className="text-xs font-bold text-white">
            5 Drivers + 2 Constructors Active
          </span>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
          <span className="text-slate-400 font-bold">F1 CDN ASSETS:</span>
          <span className="text-cyan-400 font-bold">OFFICIAL 2026</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Projected xP:</span>
          <span className="font-bold text-fpl-green text-sm">
            +{userLineup.totalExpectedPoints.toFixed(1)} pts
          </span>
        </div>
      </div>

      {/* Paddock Field Pitch Container */}
      <div className="relative rounded-3xl bg-gradient-to-b from-slate-950 via-[#0b0f19] to-slate-950 border border-fpl-border p-4 sm:p-6 overflow-hidden min-h-[580px]">
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,255,133,0.15) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,255,133,0.15) 40px)`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">

          {/* ─── Row 1: 2 Active Constructors ─── */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold mb-2 text-center">
              Active Constructors (2)
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto">
              {selectedConstructors.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-900/95 border border-fpl-border rounded-xl p-2 sm:p-3 shadow-xl backdrop-blur-md relative flex flex-col items-center text-center w-full"
                  style={{ borderLeft: `4px solid ${c.color}` }}
                >
                  <div className="text-[9px] font-mono text-slate-400 uppercase font-bold self-start mb-1">
                    Constructor
                  </div>

                  <F1AssetPhoto
                    type="constructor"
                    teamId={c.id}
                    name={c.name}
                    className="w-full h-16 sm:h-20 my-1 rounded-lg shadow-inner"
                  />

                  <div className="text-xs sm:text-sm font-black text-white w-full mt-1 leading-tight">
                    {c.name}
                  </div>

                  <div className="flex justify-between items-center w-full mt-1.5 text-[9px] sm:text-[10px] font-mono border-t border-slate-800/80 pt-1.5">
                    <span className="text-slate-400 font-semibold">${c.price.toFixed(1)}M</span>
                    <span className="text-fpl-green font-bold">+{c.xP.toFixed(1)} xP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Row 2: 5 Active Drivers ─── */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-2 text-center">
              Starting Drivers (5)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {selectedDrivers.map((driver) => {
                const isDRS = userLineup.drsBoostDriverId === driver.id;

                return (
                  <div
                    key={driver.id}
                    onClick={() => setUserLineup((prev) => ({ ...prev, drsBoostDriverId: driver.id }))}
                    className={cn(
                      "bg-slate-900/95 border rounded-xl p-2 sm:p-2.5 flex flex-col justify-between items-center text-center transition-all cursor-pointer shadow-lg hover:scale-105 select-none w-full",
                      isDRS
                        ? "border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)] bg-slate-900"
                        : "border-fpl-border"
                    )}
                  >
                    {/* Grid + Number header row, with DRS badge inline */}
                    <div className="w-full flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-slate-400 mb-1">
                      <span className="font-bold text-amber-400">P{driver.gridPosition}</span>
                      {isDRS ? (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                          <Star className="w-2 h-2 fill-slate-950 shrink-0" />
                          <span>2X DRS</span>
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-200">#{driver.number}</span>
                      )}
                    </div>

                    {/* Official F1 CDN Driver Headshot */}
                    <F1AssetPhoto
                      type="driver"
                      driverId={driver.id}
                      driverShortName={driver.shortName}
                      teamId={driver.teamId}
                      name={driver.name}
                      className="w-full h-16 sm:h-20 my-1 shadow-inner rounded-lg"
                    />

                    {/* Short code + Full name stacked */}
                    <div className="w-full mt-1">
                      <div className="text-xs sm:text-sm font-black text-white leading-none">
                        {driver.shortName}
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight mt-0.5 min-h-[14px]">
                        {driver.name}
                      </div>
                    </div>

                    {/* Price + xP footer */}
                    <div className="w-full pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[9px] sm:text-[10px] font-mono mt-1.5">
                      <span className="text-slate-400 font-semibold">${driver.price.toFixed(1)}M</span>
                      <span className="text-fpl-green font-bold">
                        +{isDRS ? (driver.xP * 2).toFixed(1) : driver.xP.toFixed(1)}
                      </span>
                    </div>

                    {/* ORP Bonus Badge */}
                    {driver.orp >= 10.0 && (
                      <div className="mt-1 w-full text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded font-mono font-bold flex items-center justify-center gap-0.5 border border-amber-500/30">
                        <ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                        <span>+{driver.orp.toFixed(0)} ORP</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ─── Bench Reserve Drivers ─── */}
      <div className="bg-slate-950/85 border border-fpl-border rounded-2xl p-3 sm:p-4 shadow-md">
        <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center justify-between">
          <span>Bench Reserve Drivers</span>
          <span className="text-[8px] sm:text-[9px] text-slate-500 font-normal hidden sm:inline">Substitutes & Targets</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {benchDrivers.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-col items-center text-center w-full transition-all hover:bg-slate-800/80"
            >
              <div className="w-full flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
                <span>P{d.gridPosition}</span>
              </div>
              
              <F1AssetPhoto type="driver" driverId={d.id} driverShortName={d.shortName} teamId={d.teamId} name={d.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shrink-0 my-1" />

              <div className="w-full mt-1">
                <div className="text-[11px] sm:text-xs font-black text-white leading-none">
                  {d.shortName}
                </div>
                <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                  {d.name.split(' ').pop()}
                </div>
              </div>

              <div className="w-full pt-1.5 mt-1.5 border-t border-slate-800/60 flex justify-between items-center text-[9px] sm:text-[10px] font-mono">
                <span className="text-cyan-400 font-bold">${d.price.toFixed(1)}M</span>
                <span className="text-fpl-green font-bold">+{d.xP.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

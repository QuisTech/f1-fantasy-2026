import React from 'react';
import type { Driver, Constructor, ChipStatus, UserLineup } from '../types/f1';
import { optimizeLineup } from '../utils/optimizer';
import { Zap, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TeamBuilderProps {
  drivers: Driver[];
  constructors: Constructor[];
  chips: ChipStatus[];
  userLineup: UserLineup;
  setUserLineup: React.Dispatch<React.SetStateAction<UserLineup>>;
  onDataUpdate?: (data: any) => void;
}

export const TeamBuilder: React.FC<TeamBuilderProps> = ({
  drivers,
  constructors,
  userLineup,
  setUserLineup,
  onDataUpdate,
}) => {
  const selectedDrivers = drivers.filter((d) => userLineup.driverIds.includes(d.id));
  const selectedConstructors = constructors.filter((c) => userLineup.constructorIds.includes(c.id));

  const driverCost = selectedDrivers.reduce((acc, d) => acc + d.price, 0);
  const constructorCost = selectedConstructors.reduce((acc, constr) => acc + constr.price, 0);
  const totalCost = Number((driverCost + constructorCost).toFixed(1));
  const bankRemaining = Number((100.0 - totalCost).toFixed(1));

  const handleRemoveDriver = (driverId: string) => {
    setUserLineup((prev) => ({
      ...prev,
      driverIds: prev.driverIds.filter((id) => id !== driverId),
    }));
  };

  const handleAddDriver = (driverId: string) => {
    if (userLineup.driverIds.length >= 5) return;
    setUserLineup((prev) => ({
      ...prev,
      driverIds: [...prev.driverIds, driverId],
    }));
  };

  const handleRemoveConstructor = (teamId: any) => {
    setUserLineup((prev) => ({
      ...prev,
      constructorIds: prev.constructorIds.filter((id) => id !== teamId),
    }));
  };

  const handleAutoOptimize = () => {
    const result = optimizeLineup(drivers, constructors, 100.0);
    if (result) {
      setUserLineup((prev) => ({
        ...prev,
        driverIds: result.drivers.map((d) => d.id),
        constructorIds: result.constructors.map((c) => c.id),
        drsBoostDriverId: result.drsBoostDriver.id,
        bankBudget: result.bankRemaining,
        totalCost: result.totalCost,
        totalExpectedPoints: result.totalXP,
      }));
    }
  };

  const [isSyncing, setIsSyncing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    try {
      const text = await file.text();
      // Dynamically import to keep bundle small if not syncing
      const { parseHarFile } = await import('../utils/harParser');
      const data = await parseHarFile(text);
      if (onDataUpdate) {
        onDataUpdate(data);
        alert('Data successfully synced and processed locally!');
      }
    } catch (err: any) {
      alert(`Error parsing HAR file: ${err.message}`);
    } finally {
      setIsSyncing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSyncClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start w-full">
      {/* Left Roster Planner */}
      <div className="xl:col-span-8 flex flex-col space-y-5">
        
        {/* Top Control Action Bar */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="flex-1">
            <h2 className="text-sm font-extrabold flex flex-wrap items-center gap-2 text-white">
              <span className="text-amber-400">🛠️ ROSTER STRATEGY PLANNER</span>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                5 DRIVERS + 2 CONSTRUCTORS
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Select 7 assets within $100.0M budget. Set 2x DRS Boost on your highest projected driver.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
            <input 
              type="file" 
              accept=".har" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button 
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold text-[10px] px-3 py-1.5 rounded-lg hover:bg-blue-600/30 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider w-full disabled:opacity-50"
            >
              <span>{isSyncing ? 'SYNCING...' : 'SYNC HAR DATA'}</span>
            </button>
            <button onClick={handleAutoOptimize} className="bg-gradient-to-r from-f1-red to-red-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-[0_0_15px_rgba(225,6,0,0.3)] flex items-center justify-center gap-1.5 uppercase tracking-wider hover:scale-105 transition-all w-full shrink-0">
              <Zap className="w-4 h-4 fill-white shrink-0" />
              <span>1-Click Auto-Optimize</span>
            </button>
          </div>
        </div>

        {/* 5 Drivers Roster Section */}
        <div className="bg-card-bg border border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center text-xs font-bold text-slate-300 border-b border-slate-800 pb-3 gap-2">
            <span className="text-cyan-400 font-extrabold uppercase">Drivers ({selectedDrivers.length}/5)</span>
            <span className="text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              Subtotal: <span className="text-white">${driverCost.toFixed(1)}M</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDrivers.map((driver) => {
              const isDRS = userLineup.drsBoostDriverId === driver.id;

              return (
                <div
                  key={driver.id}
                  className={cn(
                    "rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all border",
                    isDRS 
                      ? "bg-slate-900 border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.15)]" 
                      : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700"
                  )}
                >
                  <div className="min-w-0 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-sm text-white">{driver.name}</span>
                      {isDRS && <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">2X DRS</span>}
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-cyan-400 font-bold">${driver.price.toFixed(1)}M</span>
                      <span className="hidden sm:inline text-slate-600">•</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">P{driver.gridPosition}</span>
                      <span className="hidden sm:inline text-slate-600">•</span>
                      <span className="text-fpl-green font-bold bg-fpl-green/10 px-1.5 py-0.5 rounded">+{driver.xP.toFixed(1)} xP</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                    <button
                      onClick={() => setUserLineup((prev) => ({ ...prev, drsBoostDriverId: driver.id }))}
                      className={cn(
                        "text-[10px] font-mono font-bold px-3 py-1.5 rounded transition-all flex-1 sm:flex-none",
                        isDRS 
                          ? "bg-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.4)]" 
                          : "bg-slate-900 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-500"
                      )}
                    >
                      DRS
                    </button>
                    <button
                      onClick={() => handleRemoveDriver(driver.id)}
                      className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white cursor-pointer p-1.5 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}

            {Array.from({ length: 5 - selectedDrivers.length }).map((_, idx) => (
              <div
                key={`empty-d-${idx}`}
                className="border border-dashed border-slate-800/80 bg-slate-950/30 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 gap-2 font-mono hover:border-slate-600 transition-colors"
              >
                <Plus className="w-6 h-6 text-slate-700 shrink-0 mb-1" />
                <span className="text-xs">Driver Slot #{selectedDrivers.length + idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2 Constructors Roster Section */}
        <div className="bg-card-bg border border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap justify-between items-center text-xs font-bold text-slate-300 border-b border-slate-800 pb-3 gap-2">
            <span className="text-cyan-400 font-extrabold uppercase">Constructors ({selectedConstructors.length}/2)</span>
            <span className="text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
              Subtotal: <span className="text-white">${constructorCost.toFixed(1)}M</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedConstructors.map((c) => (
              <div
                key={c.id}
                className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-colors"
                style={{ borderLeftWidth: '4px', borderLeftColor: c.color }}
              >
                <div className="min-w-0 flex-1 w-full">
                  <div className="font-extrabold text-sm text-white mb-1">{c.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-cyan-400 font-bold">${c.price.toFixed(1)}M</span>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Pit: {c.avgPitStopSec}s</span>
                    <span className="hidden sm:inline text-slate-600">•</span>
                    <span className="text-fpl-green font-bold bg-fpl-green/10 px-1.5 py-0.5 rounded">+{c.xP.toFixed(1)} xP</span>
                  </div>
                </div>

                <div className="flex w-full sm:w-auto justify-end mt-2 sm:mt-0 border-t sm:border-0 border-slate-800 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleRemoveConstructor(c.id)}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white cursor-pointer p-1.5 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            ))}

            {Array.from({ length: 2 - selectedConstructors.length }).map((_, idx) => (
              <div
                key={`empty-c-${idx}`}
                className="border border-dashed border-slate-800/80 bg-slate-950/30 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 gap-2 font-mono hover:border-slate-600 transition-colors"
              >
                <Plus className="w-6 h-6 text-slate-700 shrink-0 mb-1" />
                <span className="text-xs">Constructor Slot #{selectedConstructors.length + idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Budget Summary & Asset Marketplace */}
      <div className="xl:col-span-4 flex flex-col space-y-5">
        
        {/* Budget & Penalty Summary Box */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
            BUDGET & PENALTY SUMMARY
          </h3>

          <div className="space-y-3 text-[11px] sm:text-xs font-mono">
            <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 p-2 rounded-lg">
              <span>Total Cap:</span>
              <span className="text-white font-bold text-sm">$100.0M</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 p-2 rounded-lg">
              <span>Lineup Cost:</span>
              <span className={cn("font-bold text-sm", totalCost > 100 ? "text-red-400" : "text-white")}>
                ${totalCost.toFixed(1)}M
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
              <span>Bank Remaining:</span>
              <span className={cn("font-black text-sm", bankRemaining >= 0 ? "text-fpl-green" : "text-red-500")}>
                ${bankRemaining.toFixed(1)}M
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-red-400 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>Transfer Penalty Notice</span>
                </div>
                <p className="text-[10px] text-red-200/80 leading-relaxed">
                  Extra transfers cost <strong className="text-white font-bold">-10 points each</strong> in F1 Fantasy!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Drivers Marketplace */}
        <div className="bg-card-bg border border-slate-800 rounded-2xl flex flex-col shadow-lg overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)', minHeight: '400px' }}>
          <div className="bg-slate-900 p-4 border-b border-slate-800 shrink-0">
            <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span>DRIVER MARKETPLACE</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
            {drivers
              .filter((d) => !userLineup.driverIds.includes(d.id))
              .sort((a, b) => b.xP - a.xP)
              .map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-950/80 p-3 rounded-xl text-xs border border-slate-800/80 hover:border-slate-600 transition-colors gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-[13px] mb-1">{d.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">${d.price.toFixed(1)}M</span>
                      <span className="text-slate-600">•</span>
                      <span className="bg-slate-900 px-1.5 py-0.5 rounded">Grid P{d.gridPosition}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddDriver(d.id)}
                    disabled={userLineup.driverIds.length >= 5 || d.price > bankRemaining}
                    className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-2 sm:py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-cyan-500/20 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed w-full sm:w-auto text-center shrink-0 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              ))}
              
            {drivers.filter((d) => !userLineup.driverIds.includes(d.id)).length === 0 && (
              <div className="text-center p-6 text-slate-500 text-xs font-mono">
                No drivers available.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { Driver, Constructor, UserLineup, RoundKey } from '../types/f1';
import { F1AssetPhoto } from './F1AssetPhoto';
import { Star, ArrowUpRight, Lock, Unlock, Ban, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  getDriverRoundPoints,
  getConstructorRoundPoints,
  getDriverPointsHistory,
  getConstructorPointsHistory,
  type RoundPerformance,
} from '../services/historicalData';
import { optimizeLineup } from '../utils/optimizer';

interface FormModalState {
  id: string;
  name: string;
  shortName: string;
  type: 'driver' | 'constructor';
  teamName?: string;
  price: number;
  history: RoundPerformance[];
}

interface PaddockGridProps {
  drivers: Driver[];
  constructors: Constructor[];
  userLineup: UserLineup;
  setUserLineup: React.Dispatch<React.SetStateAction<UserLineup>>;
  lockedDriverIds: string[];
  setLockedDriverIds: React.Dispatch<React.SetStateAction<string[]>>;
  excludedDriverIds: string[];
  setExcludedDriverIds: React.Dispatch<React.SetStateAction<string[]>>;
  onHarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activeRound?: RoundKey;
  onRoundChange?: (round: RoundKey) => void;
  strategyMode?: 'safe' | 'aggressive' | 'value';
  setWildcardMode?: (mode: boolean) => void;
  onToast?: (msg: string) => void;
}

export const PaddockGrid: React.FC<PaddockGridProps> = ({
  drivers,
  constructors,
  userLineup,
  setUserLineup,
  lockedDriverIds,
  setLockedDriverIds,
  excludedDriverIds,
  setExcludedDriverIds,
  onHarUpload,
  activeRound = 'R14',
  onRoundChange,
  strategyMode = 'safe',
  setWildcardMode,
  onToast,
}) => {
  const [formModal, setFormModal] = useState<FormModalState | null>(null);
  const [activeInlinePopoverId, setActiveInlinePopoverId] = useState<string | null>(null);

  const toggleLock = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const dName = drivers.find((d) => d.id === id)?.shortName || 'Driver';
    if (lockedDriverIds.includes(id)) {
      setLockedDriverIds((prev) => prev.filter((x) => x !== id));
      onToast?.(`🔓 Unlocked ${dName}`);
    } else {
      setLockedDriverIds((prev) => [...prev, id]);
      setExcludedDriverIds((prev) => prev.filter((x) => x !== id));
      onToast?.(`🔒 Locked ${dName} — guaranteed in all optimizer runs`);
    }
  };

  const toggleExclude = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const targetDriver = drivers.find((d) => d.id === id);
    const dName = targetDriver?.shortName || 'Driver';

    if (excludedDriverIds.includes(id)) {
      setExcludedDriverIds((prev) => prev.filter((x) => x !== id));
      onToast?.(`Unbanned ${dName} — restored to optimizer pool`);
    } else {
      const newExcluded = [...excludedDriverIds, id];
      const newLocks = lockedDriverIds.filter((x) => x !== id);
      setExcludedDriverIds(newExcluded);
      setLockedDriverIds(newLocks);

      // If the excluded driver is in active lineup, run the optimizer immediately to bench them and draft replacement
      if (userLineup.driverIds.includes(id)) {
        if (setWildcardMode) setWildcardMode(false);
        const budget = userLineup.teamValue > 0 ? userLineup.teamValue : 100.0;
        const result = optimizeLineup(drivers, constructors, budget, newLocks, newExcluded, strategyMode);

        if (result) {
          const incoming = result.drivers.find((d) => !userLineup.driverIds.includes(d.id));

          setUserLineup((prev) => ({
            ...prev,
            driverIds: result.drivers.map((d) => d.id),
            constructorIds: result.constructors.map((c) => c.id),
            drsBoostDriverId: result.drsBoostDriver.id,
            bankBudget: result.bankRemaining,
            totalCost: result.totalCost,
            totalExpectedPoints: result.totalXP,
          }));

          onToast?.(`⛔ Excluded ${dName}: Benched & replaced with ${incoming?.shortName || 'replacement'} (+${result.totalXP} xP)`);
        } else {
          onToast?.(`⚠️ Cannot exclude ${dName}: No alternative valid team within $${budget.toFixed(1)}M budget.`);
        }
      } else {
        onToast?.(`⛔ Excluded ${dName} from future optimizer lineups.`);
      }
    }
  };

  const [showAllBench, setShowAllBench] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const selectedDrivers = drivers.filter((d) => userLineup.driverIds.includes(d.id));
  const selectedConstructors = constructors.filter((c) => userLineup.constructorIds.includes(c.id));
  const unownedDrivers = drivers.filter((d) => !userLineup.driverIds.includes(d.id));
  const benchDrivers = showAllBench ? unownedDrivers : unownedDrivers.slice(0, 4);

  const handleAutoOptimize = () => {
    setIsOptimizing(true);
    const budget = userLineup.teamValue > 0 ? userLineup.teamValue : 100.0;

    setTimeout(() => {
      const result = optimizeLineup(drivers, constructors, budget, lockedDriverIds, excludedDriverIds, strategyMode);
      if (result) {
        if (setWildcardMode) setWildcardMode(false);
        setUserLineup((prev) => ({
          ...prev,
          driverIds: result.drivers.map((d) => d.id),
          constructorIds: result.constructors.map((c) => c.id),
          drsBoostDriverId: result.drsBoostDriver.id,
          bankBudget: result.bankRemaining,
          totalCost: result.totalCost,
          totalExpectedPoints: result.totalXP,
        }));
        onToast?.(`⚡ 1-Click Auto-Optimize: Loaded best ${strategyMode.toUpperCase()} lineup (+${result.totalXP} xP | $${result.totalCost}M)!`);
      } else {
        onToast?.(`⚠️ No valid lineup found under $${budget.toFixed(1)}M with current locks/exclusions.`);
      }
      setIsOptimizing(false);
    }, 150);
  };

  const handleSubInDriver = (benchDriverId: string) => {
    if (setWildcardMode) setWildcardMode(false);
    if (excludedDriverIds.includes(benchDriverId)) {
      setExcludedDriverIds((prev) => prev.filter((x) => x !== benchDriverId));
    }

    const incoming = drivers.find((d) => d.id === benchDriverId);

    // If active lineup has less than 5 drivers, simply add them
    if (userLineup.driverIds.length < 5) {
      setUserLineup((prev) => ({
        ...prev,
        driverIds: [...prev.driverIds, benchDriverId],
      }));
      onToast?.(`✅ Subbed in ${incoming?.shortName || 'driver'} into lineup`);
      return;
    }

    // Otherwise, replace the lowest xP unpinned driver
    const activeDriverObjects = drivers.filter((d) => userLineup.driverIds.includes(d.id));
    const unpinned = activeDriverObjects.filter((d) => !lockedDriverIds.includes(d.id));
    const targetToReplace = unpinned.length > 0
      ? [...unpinned].sort((a, b) => a.xP - b.xP)[0]
      : [...activeDriverObjects].sort((a, b) => a.xP - b.xP)[0];

    setUserLineup((prev) => ({
      ...prev,
      driverIds: prev.driverIds.map((id) => (id === targetToReplace.id ? benchDriverId : id)),
    }));

    onToast?.(`🔄 Subbed in ${incoming?.shortName || 'driver'} for ${targetToReplace.shortName}`);
  };

  const renderFormTriggerAndPopover = (
    id: string,
    name: string,
    shortName: string,
    type: 'driver' | 'constructor',
    price: number,
    history: RoundPerformance[],
    teamName?: string
  ) => {
    const totalPoints = history.reduce((sum, h) => sum + h.points, 0);
    const isInlineOpen = activeInlinePopoverId === id;

    return (
      <div className="relative w-full mt-1.5 pt-1.5 border-t border-slate-800/60">
        {/* 1. Default Surface (Clean, minimalist summary - taps open inline popover or toggles) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveInlinePopoverId((prev) => (prev === id ? null : id));
          }}
          className="flex items-center justify-between w-full text-[8.5px] font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer py-0.5 select-none touch-manipulation"
          title="Tap to show 6-race ribbon, or hover on desktop"
        >
          <span className="flex items-center gap-1 font-semibold">
            <span>📈</span>
            <span className="uppercase text-[8px] tracking-tight">Form (6R)</span>
          </span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded font-bold font-mono text-[8px] flex items-center gap-0.5 transition-colors",
              isInlineOpen
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : totalPoints >= 0
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/25"
                : "bg-rose-950/40 text-rose-300 border border-rose-500/25"
            )}
          >
            {totalPoints >= 0 ? `+${totalPoints}` : totalPoints} pts ▾
          </span>
        </div>

        {/* 2. Hover / Tap Popover: Interactive 6-Round Ribbon */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 bg-slate-950/98 border border-cyan-500/40 rounded-lg p-1.5 shadow-2xl backdrop-blur-md transition-all duration-150 flex flex-col gap-1",
            isInlineOpen
              ? "opacity-100 pointer-events-auto ring-1 ring-cyan-400/40"
              : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
          )}
        >
          <div className="flex items-center justify-between text-[7px] font-mono font-bold uppercase text-cyan-400 px-0.5">
            <span className="truncate">6-Race Form Guide</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormModal({
                    id,
                    name,
                    shortName,
                    type,
                    teamName,
                    price,
                    history,
                  });
                  setActiveInlinePopoverId(null);
                }}
                className="text-[6.5px] font-mono text-cyan-300 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 px-1 py-0.2 rounded transition-colors cursor-pointer"
                title="Open full detailed modal breakdown"
              >
                Modal ↗
              </button>
              {isInlineOpen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveInlinePopoverId(null);
                  }}
                  className="text-[7.5px] text-slate-400 hover:text-white px-1 rounded transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-0.5 w-full">
            {history.map((h) => (
              <button
                key={h.roundKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRoundChange?.(h.roundKey);
                  setActiveInlinePopoverId(null);
                }}
                className={cn(
                  "flex-1 py-1 px-0.5 rounded text-[7px] sm:text-[6.5px] font-mono font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 text-center truncate touch-manipulation",
                  activeRound === h.roundKey
                    ? "bg-fpl-green text-slate-950 font-black shadow-sm ring-1 ring-fpl-green/60"
                    : h.points > 0
                    ? "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
                    : "bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/40"
                )}
                title={`Switch to ${h.roundKey} (${h.grandPrix}): ${h.points} pts | $${h.price.toFixed(1)}M`}
              >
                {h.roundKey.replace('R', '')}:{h.points >= 0 ? `+${h.points}` : h.points}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-grow flex flex-col justify-start space-y-4 py-2 w-full overflow-x-hidden">
      {/* Paddock Header Ribbon */}
      <div className="bg-slate-950/85 border border-fpl-border rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 w-full">
        {/* Left Side: Status, Active Round, and Projected Points */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="bg-fpl-green/10 border border-fpl-green/30 text-fpl-green font-mono font-black text-[11px] px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-fpl-green animate-pulse shrink-0" />
            <span>OFFICIAL PADDOCK</span>
          </span>
          <span className="text-xs font-bold text-white whitespace-nowrap">
            5D + 2C • {activeRound} View
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded shadow-inner">
            <span className="text-slate-400">Projected xP:</span>
            <span className="font-black text-fpl-green">+{userLineup.totalExpectedPoints.toFixed(1)} pts</span>
          </span>
        </div>

        {/* Right Side: Action Buttons (AUTO-OPTIMIZE, REFRESH FEEDS & SYNC HAR) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={handleAutoOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 bg-gradient-to-r from-f1-red to-red-700 hover:from-red-600 hover:to-red-800 text-white px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition-all whitespace-nowrap uppercase tracking-wider shadow-sm active:scale-95 disabled:opacity-50"
            title="Automatically compute the optimal 5 Drivers + 2 Constructors team under your budget respecting current locks and exclusions"
          >
            <Zap className={cn("w-3.5 h-3.5 fill-white shrink-0", isOptimizing && "animate-spin text-amber-300")} />
            <span>{isOptimizing ? 'SOLVING...' : 'AUTO-OPTIMIZE'}</span>
          </button>

          <label className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white px-3 py-1.5 text-[10px] font-bold rounded-lg cursor-pointer border border-emerald-500/40 transition-all whitespace-nowrap uppercase tracking-wider shadow-sm active:scale-95">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>SYNC HAR</span>
            <input type="file" accept=".har" className="hidden" onChange={onHarUpload} />
          </label>
        </div>
      </div>

      {/* ─── Active Constraints & Rules Ribbon (Locks, Bans & Reset All) ─── */}
      {(lockedDriverIds.length > 0 || excludedDriverIds.length > 0) && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-md backdrop-blur animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 flex items-center gap-1 mr-1">
              <span>⚖️</span>
              <span>ACTIVE RULES:</span>
            </span>

            {lockedDriverIds.map((id) => {
              const d = drivers.find((x) => x.id === id);
              return (
                <button
                  key={`lock-${id}`}
                  type="button"
                  onClick={() => {
                    setLockedDriverIds((prev) => prev.filter((x) => x !== id));
                    onToast?.(`🔓 Unlocked ${d?.shortName || id}`);
                  }}
                  className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold text-[10px] cursor-pointer hover:bg-amber-500/25 transition-all shadow-sm"
                  title="Click to unlock"
                >
                  <Lock size={10} className="text-amber-400" />
                  <span>{d?.shortName || id}</span>
                  <X size={10} className="hover:text-white text-slate-400 ml-0.5" />
                </button>
              );
            })}

            {excludedDriverIds.map((id) => {
              const d = drivers.find((x) => x.id === id);
              return (
                <button
                  key={`excl-${id}`}
                  type="button"
                  onClick={() => {
                    setExcludedDriverIds((prev) => prev.filter((x) => x !== id));
                    onToast?.(`Unbanned ${d?.shortName || id} — available for lineup`);
                  }}
                  className="inline-flex items-center gap-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold text-[10px] cursor-pointer hover:bg-rose-500/25 transition-all shadow-sm"
                  title="Click to unban"
                >
                  <Ban size={10} className="text-rose-400" />
                  <span>{d?.shortName || id}</span>
                  <X size={10} className="hover:text-white text-slate-400 ml-0.5" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setLockedDriverIds([]);
              setExcludedDriverIds([]);
              onToast?.('🔄 Cleared all locked and excluded rules');
            }}
            className="text-[9.5px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shadow-inner uppercase tracking-wider"
          >
            Reset All Rules
          </button>
        </div>
      )}

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
              {selectedConstructors.map((c) => {
                const roundPoints = getConstructorRoundPoints(c.id, activeRound);
                const history = getConstructorPointsHistory(c.id);

                return (
                  <div
                    key={c.id}
                    className="group bg-slate-900/95 border border-fpl-border rounded-xl p-2 sm:p-3 shadow-xl backdrop-blur-md relative flex flex-col items-center text-center w-full overflow-hidden"
                    style={{ borderLeft: `4px solid ${c.color}` }}
                  >
                    <div className="text-[9px] font-mono text-slate-400 uppercase font-bold self-start mb-1 flex items-center justify-between w-full">
                      <span>Constructor</span>
                      {activeRound !== 'R14' && (
                        <span className="text-emerald-400 font-black">+{roundPoints} pts in {activeRound}</span>
                      )}
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
                      <span className="text-fpl-green font-bold">
                        {activeRound !== 'R14' ? `+${roundPoints} pts` : `+${c.xP.toFixed(1)} xP`}
                      </span>
                    </div>

                    {renderFormTriggerAndPopover(c.id, c.name, c.shortName, 'constructor', c.price, history, c.name)}
                  </div>
                );
              })}
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
                const roundPoints = getDriverRoundPoints(driver.id, activeRound);
                const score = isDRS ? roundPoints * 2 : roundPoints;
                const history = getDriverPointsHistory(driver.id);

                return (
                  <div
                    key={driver.id}
                    onClick={() => setUserLineup((prev) => ({ ...prev, drsBoostDriverId: driver.id }))}
                    className={cn(
                      "group bg-slate-900/95 border rounded-xl p-2 sm:p-2.5 flex flex-col justify-between items-center text-center transition-all cursor-pointer shadow-lg hover:scale-105 select-none w-full relative overflow-hidden",
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
                    <div className="relative w-full my-1">
                      <F1AssetPhoto
                        type="driver"
                        driverId={driver.id}
                        driverShortName={driver.shortName}
                        teamId={driver.teamId}
                        name={driver.name}
                        className="w-full h-16 sm:h-20 shadow-inner rounded-lg"
                      />
                      <div className="absolute top-1 right-1 flex flex-col gap-1">
                        <button
                          onClick={(e) => toggleLock(e, driver.id)}
                          className={cn(
                            "p-1 rounded-md backdrop-blur shadow",
                            lockedDriverIds.includes(driver.id)
                              ? "bg-amber-500 text-slate-900"
                              : "bg-slate-900/50 text-slate-400 hover:text-white"
                          )}
                        >
                          {lockedDriverIds.includes(driver.id) ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>
                        <button
                          onClick={(e) => toggleExclude(e, driver.id)}
                          className={cn(
                            "p-1 rounded-md backdrop-blur shadow",
                            excludedDriverIds.includes(driver.id)
                              ? "bg-f1-red text-white"
                              : "bg-slate-900/50 text-slate-400 hover:text-red-400"
                          )}
                        >
                          <Ban size={10} />
                        </button>
                      </div>
                    </div>

                    {/* Short code + Full name stacked */}
                    <div className="w-full mt-1">
                      <div className="text-xs sm:text-sm font-black text-white leading-none">
                        {driver.shortName}
                      </div>
                      <div className="text-[9px] text-slate-400 leading-tight mt-0.5 min-h-[14px]">
                        {driver.name}
                      </div>
                    </div>

                    {/* Price + Points footer */}
                    <div className="w-full pt-1.5 border-t border-slate-800/80 flex justify-between items-center text-[9px] sm:text-[10px] font-mono mt-1.5">
                      <span className="text-slate-400 font-semibold">${driver.price.toFixed(1)}M</span>
                      <span className="text-fpl-green font-bold">
                        {activeRound !== 'R14' ? (
                          <span title={`${activeRound} Scored Points`}>
                            {score >= 0 ? `+${score}` : score} pts
                          </span>
                        ) : (
                          <span>+{isDRS ? (driver.xP * 2).toFixed(1) : driver.xP.toFixed(1)}</span>
                        )}
                      </span>
                    </div>

                    {renderFormTriggerAndPopover(driver.id, driver.name, driver.shortName, 'driver', driver.price, history, driver.teamName)}

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
        <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span>Bench Reserve Drivers ({activeRound})</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-normal">
              {showAllBench ? `Showing all ${unownedDrivers.length}` : `Top ${benchDrivers.length} of ${unownedDrivers.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllBench((prev) => !prev)}
              className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              {showAllBench ? 'Show Top 4 Only' : `View All Reserves (${unownedDrivers.length})`}
            </button>
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-normal hidden sm:inline">
              Substitutes & Targets
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {benchDrivers.map((d) => {
            const bPts = getDriverRoundPoints(d.id, activeRound);
            const history = getDriverPointsHistory(d.id);
            const isBanned = excludedDriverIds.includes(d.id);

            return (
              <div
                key={d.id}
                className={cn(
                  "group border rounded-xl p-2 sm:p-2.5 flex flex-col items-center text-center w-full transition-all hover:bg-slate-800/80 relative overflow-hidden",
                  isBanned
                    ? "bg-rose-950/20 border-rose-800/40 ring-1 ring-rose-500/30"
                    : "bg-slate-900/70 border-slate-800"
                )}
              >
                <div className="w-full flex justify-between items-center text-[9px] font-mono text-slate-500 mb-1">
                  <span>P{d.gridPosition}</span>
                  {activeRound !== 'R14' && (
                    <span className="text-emerald-400 font-bold">+{bPts} pts</span>
                  )}
                </div>

                <div className="relative my-1">
                  <F1AssetPhoto
                    type="driver"
                    driverId={d.id}
                    driverShortName={d.shortName}
                    teamId={d.teamId}
                    name={d.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shrink-0"
                  />
                  <div className="absolute top-0 right-0 flex flex-col gap-1 z-10">
                    <button
                      type="button"
                      onClick={(e) => toggleLock(e, d.id)}
                      className={cn(
                        "p-1 rounded-md backdrop-blur shadow cursor-pointer transition-colors",
                        lockedDriverIds.includes(d.id)
                          ? "bg-amber-500 text-slate-900"
                          : "bg-slate-900/80 text-slate-400 hover:text-white"
                      )}
                      title={lockedDriverIds.includes(d.id) ? "Unlock driver" : "Lock driver into lineup"}
                    >
                      {lockedDriverIds.includes(d.id) ? <Lock size={9} /> : <Unlock size={9} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => toggleExclude(e, d.id)}
                      className={cn(
                        "p-1 rounded-md backdrop-blur shadow cursor-pointer transition-colors",
                        isBanned
                          ? "bg-f1-red text-white"
                          : "bg-slate-900/80 text-slate-400 hover:text-red-400"
                      )}
                      title={isBanned ? "Unban driver" : "Exclude driver from lineup"}
                    >
                      <Ban size={9} />
                    </button>
                  </div>
                </div>

                <div className="w-full mt-1">
                  <div className="text-[11px] sm:text-xs font-black text-white leading-none">
                    {d.shortName}
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight mt-0.5">
                    {d.name.split(' ').pop()}
                  </div>
                </div>

                <div className="w-full pt-1.5 mt-1.5 border-t border-slate-800/60 flex justify-between items-center text-[9px] sm:text-[10px] font-mono">
                  <span className="text-slate-500">${d.price.toFixed(1)}M</span>
                  <span className="text-fpl-green font-bold">
                    {activeRound !== 'R14' ? `+${bPts} pts` : `+${d.xP.toFixed(1)}`}
                  </span>
                </div>

                {/* Direct Sub In ⬆ Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSubInDriver(d.id);
                  }}
                  className={cn(
                    "w-full mt-1.5 py-1 px-1.5 rounded-lg font-mono font-bold text-[8.5px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm active:scale-95",
                    isBanned
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 hover:text-white"
                  )}
                  title={`Sub ${d.shortName} into active lineup`}
                >
                  <span>{isBanned ? 'Restore & Sub In ⚡' : 'Sub In ⬆'}</span>
                </button>

                {renderFormTriggerAndPopover(d.id, d.name, d.shortName, 'driver', d.price, history, d.teamName)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Interactive 6-Race Form Modal Dialog ─── */}
      {formModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFormModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase">
                  {formModal.type === 'driver' ? 'Driver Form' : 'Constructor Form'}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-white truncate">{formModal.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ${formModal.price.toFixed(1)}M {formModal.teamName ? `• ${formModal.teamName}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 px-2 py-1">
                <span>Grand Prix / Circuit</span>
                <span>Points & Switch</span>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {formModal.history.map((h) => {
                  const isSelected = activeRound === h.roundKey;
                  return (
                    <div
                      key={h.roundKey}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs",
                        isSelected
                          ? "bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                          : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase",
                              isSelected ? "bg-fpl-green text-slate-950 font-black" : "bg-slate-800 text-slate-300"
                            )}
                          >
                            {h.roundKey}
                          </span>
                          <span className="font-bold text-slate-200 truncate text-[11px]">{h.grandPrix}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          Round Price: ${h.price.toFixed(1)}M
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            "font-mono font-black text-sm",
                            h.points >= 0 ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {h.points >= 0 ? `+${h.points}` : h.points} pts
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onRoundChange?.(h.roundKey);
                            setFormModal(null);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all cursor-pointer",
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default font-black"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 active:scale-95"
                          )}
                        >
                          {isSelected ? 'Active' : 'Jump ⚡'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
              Click <strong className="text-cyan-400">"Jump ⚡"</strong> to teleport the entire dashboard to that round.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

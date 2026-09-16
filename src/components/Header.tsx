import React from 'react';
import { cn } from '../lib/utils';
import type { Circuit, UserLineup } from '../types/f1';
import { UserCircle } from 'lucide-react';

interface HeaderProps {
  circuit: Circuit;
  riskMode: 'safe' | 'aggressive' | 'value';
  setRiskMode: (mode: 'safe' | 'aggressive' | 'value') => void;
  fuel: 'quali' | 'race' | 'eye-test';
  setFuel: (fuel: 'quali' | 'race' | 'eye-test') => void;
  userLineup: UserLineup;
  onHarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSynced: boolean;
  wildcardMode: boolean;
  setWildcardMode: (mode: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  circuit,
  riskMode,
  setRiskMode,
  fuel,
  setFuel,
  userLineup,
  onHarUpload,
  isSynced,
  wildcardMode,
  setWildcardMode,
}) => {
  return (
    <header className="col-span-12 flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between mb-4">
      {/* Brand & Circuit Title */}
      <div className="flex items-center gap-3.5 whitespace-nowrap">
        <div className="w-10 h-10 bg-f1-red rounded-lg flex items-center justify-center font-black text-xl text-white shadow-lg shadow-red-500/20 shrink-0 font-italic">
          F1
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
            <h1 className="text-2xl font-bold tracking-tight text-white whitespace-nowrap">
              F1 <span className="text-fpl-green">HORIZON</span>
            </h1>
            <span className="bg-f1-red text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
              V3 PADDOCK
            </span>
            <span className="bg-slate-900 text-cyan-400 text-[9px] font-mono px-2 py-0.5 rounded border border-cyan-500/20 uppercase whitespace-nowrap">
              {circuit.grandPrixName}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-light uppercase tracking-widest whitespace-nowrap">
            Motorsport Telemetry & Strategic Optimization Engine
          </p>
        </div>
      </div>

      {/* Control Panel Bar matching FPL Admin */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between xl:justify-end gap-3 xl:gap-4 bg-card-bg/50 p-3 sm:p-4 rounded-xl border border-fpl-border w-full xl:w-auto">
        
        <div className="flex flex-wrap items-end sm:items-center justify-start sm:justify-end gap-3 sm:gap-4 w-full xl:w-auto">
          {/* Strategy Mode Toggle */}
          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 text-left sm:text-right font-medium whitespace-nowrap">
              Strategy Mode
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded mt-1 w-full sm:w-auto">
              <button
                onClick={() => setRiskMode('safe')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  riskMode === 'safe' ? "bg-fpl-green text-slate-950" : "text-slate-400 hover:text-slate-200"
                )}
              >
                SAFE
              </button>
              <button
                onClick={() => setRiskMode('aggressive')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  riskMode === 'aggressive' ? "bg-orange-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                )}
              >
                RISKY
              </button>
              <button
                onClick={() => setRiskMode('value')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  riskMode === 'value' ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                )}
              >
                VALUE
              </button>
            </div>
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 text-left sm:text-right font-medium whitespace-nowrap">
              Team Mode
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded mt-1 w-full sm:w-auto">
              <button
                onClick={() => setWildcardMode(false)}
                disabled={!isSynced}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center whitespace-nowrap",
                  !wildcardMode ? "bg-f1-red text-white" : "text-slate-500 hover:text-slate-300",
                  !isSynced && "opacity-30 cursor-not-allowed"
                )}
              >
                {isSynced ? "MY TEAM" : "UNSYNCED"}
              </button>
              <button
                onClick={() => setWildcardMode(true)}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap flex items-center justify-center gap-1",
                  wildcardMode ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
                )}
              >
                GLOBAL OPTIMUM
              </button>
            </div>
          </div>
          
          <div className="flex flex-col w-full sm:w-auto justify-end h-full">
            <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 text-xs font-bold rounded cursor-pointer border border-slate-600 transition-colors whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              SYNC HAR
              <input type="file" accept=".har" className="hidden" onChange={onHarUpload} />
            </label>
          </div>

          {/* Telemetry Fuel Source Selector */}
          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 text-left sm:text-right font-medium whitespace-nowrap">
              Telemetry Source
            </span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded mt-1 w-full sm:w-auto">
              <button
                onClick={() => setFuel('quali')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  fuel === 'quali' ? "bg-fpl-purple text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                QUALI PACE
              </button>
              <button
                onClick={() => setFuel('race')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  fuel === 'race' ? "bg-f1-red text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                LONG RUNS
              </button>
              <button
                onClick={() => setFuel('eye-test')}
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center cursor-pointer whitespace-nowrap",
                  fuel === 'eye-test' ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-slate-200"
                )}
              >
                EYE-TEST
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px xl:h-8 w-full xl:w-px bg-slate-800 my-1 xl:my-0 shrink-0"></div>

        {/* Expected Points Summary */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3 xl:gap-4 w-full xl:w-auto whitespace-nowrap mt-2 xl:mt-0">
          <div className="flex flex-col text-left xl:text-right whitespace-nowrap">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium whitespace-nowrap">
              Expected Points
            </span>
            <div className="flex items-baseline gap-1.5 xl:justify-end whitespace-nowrap">
              <span className="text-xl font-bold text-fpl-green tabular-nums whitespace-nowrap">
                +{userLineup.totalExpectedPoints.toFixed(1)} xP
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
              5 Drivers + 2 Constructors (Cap 2×)
            </span>
          </div>
          
          <button className="flex items-center gap-2 bg-fpl-green text-slate-950 px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-fpl-green/90 transition-colors shrink-0 whitespace-nowrap">
            <UserCircle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Paddock Auth</span>
          </button>
        </div>

      </div>
    </header>
  );
};

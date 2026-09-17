import React from 'react';
import { cn } from '../lib/utils';
import type { Circuit, UserLineup } from '../types/f1';
import { UserCircle } from 'lucide-react';

interface HeaderProps {
  circuit: Circuit;
  riskMode: 'safe' | 'aggressive' | 'value';
  setRiskMode: (mode: 'safe' | 'aggressive' | 'value') => void;
  userLineup: UserLineup;
  isSynced: boolean;
  wildcardMode: boolean;
  setWildcardMode: (mode: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  circuit,
  riskMode,
  setRiskMode,
  userLineup,
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
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between xl:justify-end gap-4 xl:gap-6 bg-card-bg/50 p-3.5 sm:p-4 rounded-xl border border-fpl-border w-full xl:w-auto">
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full xl:w-auto">
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
                className={cn(
                  "flex-1 sm:flex-none px-3 py-1 text-[10px] rounded font-bold transition-all text-center whitespace-nowrap cursor-pointer",
                  !wildcardMode ? "bg-f1-red text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {isSynced ? "MY TEAM" : "CUSTOM SQUAD"}
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
          
        </div>

        {/* Divider */}
        <div className="h-px xl:h-8 w-full xl:w-px bg-slate-800 my-1 xl:my-0 shrink-0"></div>

        {/* Expected Points Summary */}
        <div className="flex items-center justify-between xl:justify-end gap-4 xl:gap-6 w-full xl:w-auto whitespace-nowrap">
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

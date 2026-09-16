import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera } from 'lucide-react';
import { cn } from './lib/utils';
import {
  CURRENT_CIRCUIT,
  INITIAL_DRIVERS,
  INITIAL_CONSTRUCTORS,
  INITIAL_CHIPS,
  MOCK_USER_LINEUP,
} from './data/f1Data';
import type { UserLineup } from './types/f1';
import { Header } from './components/Header';
import { MetricsColumn } from './components/MetricsColumn';
import { RightColumn } from './components/RightColumn';
import { PaddockGrid } from './components/PaddockGrid';
import { TeamBuilder } from './components/TeamBuilder';
import { FinalFixAnalyzer } from './components/FinalFixAnalyzer';
import { TeammateDominance } from './components/TeammateDominance';
import { RivalSpy } from './components/RivalSpy';
import { MultiWeekPlanner } from './components/MultiWeekPlanner';
import { F1_CALENDAR, parseHarFile } from './utils/harParser';
import { optimizeLineup } from './utils/optimizer';

export function App() {
  const [riskMode, setRiskMode] = useState<'safe' | 'aggressive' | 'value'>('safe');
  const [fuel, setFuel] = useState<'quali' | 'race' | 'eye-test'>('quali');
  const [tab, setTab] = useState<'paddock' | 'optimizer' | 'finalfix' | 'roadmap' | 'metrics' | 'rivals'>('paddock');
  const [userLineup, setUserLineup] = useState<UserLineup>(MOCK_USER_LINEUP);
  
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [constructors, setConstructors] = useState(INITIAL_CONSTRUCTORS);
  const [circuit, setCircuit] = useState(CURRENT_CIRCUIT);
  
  const [isSynced, setIsSynced] = useState(false);
  const [lockedDriverIds, setLockedDriverIds] = useState<string[]>([]);
  const [excludedDriverIds, setExcludedDriverIds] = useState<string[]>([]);
  const [wildcardMode, setWildcardMode] = useState(!isSynced); // Defaults to true if not synced

  const handleHarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const result = await parseHarFile(text);
        setDrivers(result.drivers);
        setConstructors(result.constructors);
        setCircuit(result.circuit);
        if (result.userLineup) {
          setUserLineup(result.userLineup);
          setIsSynced(true);
          setWildcardMode(false); // Switch to their team view
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse HAR file.');
      }
    };
    reader.readAsText(file);
  };

  const handleDataUpdate = (data: any) => {
    setDrivers(data.drivers);
    setConstructors(data.constructors);
    setCircuit(data.circuit);
  };

  // If Wildcard Mode, we compute the Global Optimum on the fly
  let effectiveUserLineup = userLineup;
  if (wildcardMode) {
    // For wildcard mode, assume 100M budget if not synced, or their real teamValue if synced
    const budget = isSynced ? effectiveUserLineup.teamValue : 100.0;
    const opt = optimizeLineup(drivers, constructors, budget, lockedDriverIds, excludedDriverIds);
    if (opt) {
      effectiveUserLineup = {
        driverIds: opt.drivers.map(d => d.id),
        constructorIds: opt.constructors.map(c => c.id),
        drsBoostDriverId: opt.drivers[0]?.id || "", // simplest fallback
        activeChip: 'wildcard',
        freeTransfers: 0,
        bankBudget: parseFloat((budget - opt.totalCost).toFixed(1)),
        totalCost: opt.totalCost,
        teamValue: budget,
        totalExpectedPoints: opt.totalXP
      };
    }
  }

  // Derive dynamic totals based on selected IDs
  const selectedDrivers = drivers.filter(d => effectiveUserLineup.driverIds.includes(d.id));
  const selectedConstructors = constructors.filter(c => effectiveUserLineup.constructorIds.includes(c.id));
  
  const driverCost = selectedDrivers.reduce((acc, d) => acc + d.price, 0);
  const constructorCost = selectedConstructors.reduce((acc, c) => acc + c.price, 0);
  const totalCost = driverCost + constructorCost;
  
  let totalXP = 0;
  selectedDrivers.forEach(d => {
    totalXP += (d.id === effectiveUserLineup.drsBoostDriverId) ? d.xP * 2 : d.xP;
  });
  selectedConstructors.forEach(c => {
    totalXP += c.xP;
  });

  const derivedUserLineup = {
    ...effectiveUserLineup,
    totalCost,
    bankBudget: effectiveUserLineup.teamValue - totalCost,
    totalExpectedPoints: totalXP
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f8fafc] p-4 sm:p-6 font-sans">
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-4 auto-rows-min">
        
        {/* Top Header Bar matching fpl-admin */}
        <Header
          circuit={circuit}
          riskMode={riskMode}
          setRiskMode={setRiskMode}
          fuel={fuel}
          setFuel={setFuel}
          userLineup={derivedUserLineup}
          onHarUpload={handleHarUpload}
          isSynced={isSynced}
          wildcardMode={wildcardMode}
          setWildcardMode={setWildcardMode}
        />

        {/* Left Column: Metrics & Squad Values */}
        <MetricsColumn
          userLineup={derivedUserLineup}
          drivers={drivers}
          riskMode={riskMode}
        />

        {/* Primary Center Content Area matching fpl-admin */}
        <div className="col-span-12 lg:col-span-6 bg-card-bg border border-fpl-border rounded-3xl overflow-hidden relative shadow-xl min-h-[600px]">
          {/* Subtle Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.1) 40px)`,
            }}
          />

          <div className="relative z-10 p-4 sm:p-6 h-full flex flex-col">
            
            {/* Tab Pill Navigation & Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
              <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-fpl-border w-full md:w-auto justify-center">
                {(
                  [
                    { id: 'paddock', label: 'Paddock Grid' },
                    { id: 'optimizer', label: 'Optimizer' },
                    { id: 'finalfix', label: 'Final Fix' },
                    { id: 'roadmap', label: 'Multi-Week Planner' },
                    { id: 'metrics', label: 'Metrics' },
                    { id: 'rivals', label: 'Rival Spy' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                      tab === t.id
                        ? "bg-fpl-green text-slate-950 shadow-[0_0_15px_rgba(0,255,133,0.3)]"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
                <button
                  onClick={() => alert("Lineup snapshot saved for post-race verification!")}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-1.5 bg-slate-900 border border-fpl-border rounded-xl text-xs font-black uppercase text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-fpl-green" />
                  <span>Snapshot</span>
                </button>
              </div>
            </div>

            {/* Main Tab Content with AnimatePresence */}
            <AnimatePresence mode="wait">
              {tab === 'paddock' ? (
                <motion.div
                  key="paddock"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PaddockGrid
                    drivers={drivers}
                    constructors={constructors}
                    userLineup={derivedUserLineup}
                    setUserLineup={setUserLineup}
                  
                        lockedDriverIds={lockedDriverIds}
                        setLockedDriverIds={setLockedDriverIds}
                        excludedDriverIds={excludedDriverIds}
                        setExcludedDriverIds={setExcludedDriverIds}
                      />
                </motion.div>
              ) : tab === 'optimizer' ? (
                <motion.div
                  key="optimizer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TeamBuilder
                    drivers={drivers}
                    constructors={constructors}
                    chips={INITIAL_CHIPS}
                    userLineup={derivedUserLineup}
                    setUserLineup={setUserLineup}
                    onDataUpdate={handleDataUpdate}
                  
                        lockedDriverIds={lockedDriverIds}
                        excludedDriverIds={excludedDriverIds}
                      />
                </motion.div>
              ) : tab === 'finalfix' ? (
                <motion.div
                  key="finalfix"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <FinalFixAnalyzer
                    drivers={drivers}
                    userLineup={derivedUserLineup}
                    setUserLineup={setUserLineup}
                  />
                </motion.div>
              ) : tab === 'roadmap' ? (
                <motion.div
                  key="roadmap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <MultiWeekPlanner
                    drivers={drivers}
                    constructors={constructors}
                    userLineup={derivedUserLineup}
                    calendar={F1_CALENDAR as any}
                  
                         />
                </motion.div>
              ) : tab === 'metrics' ? (
                <motion.div
                  key="metrics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TeammateDominance
                    drivers={drivers}
                    constructors={constructors}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="rivals"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <RivalSpy
                    drivers={drivers}
                    constructors={constructors}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Right Column: Top Value Picks & Fixture Calendar */}
        <RightColumn
          drivers={drivers}
          circuit={circuit}
        />

      </div>
    </div>
  );
}

export default App;

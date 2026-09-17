import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { cn } from './lib/utils';
import {
  CURRENT_CIRCUIT,
  INITIAL_DRIVERS,
  INITIAL_CONSTRUCTORS,
  INITIAL_CHIPS,
  MOCK_USER_LINEUP,
} from './data/f1Data';
import type { UserLineup, TeamId, RoundKey } from './types/f1';
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
import { F1_RAW_CONSTRUCTOR_ID_MAP } from './utils/eliteConsensus';

export function App() {
  const [riskMode, setRiskMode] = useState<'safe' | 'aggressive' | 'value'>('safe');
  const [tab, setTab] = useState<'paddock' | 'optimizer' | 'finalfix' | 'roadmap' | 'metrics' | 'rivals'>('paddock');
  const [activeRound, setActiveRound] = useState<RoundKey>('R14');
  const [userLineup, setUserLineup] = useState<UserLineup>(MOCK_USER_LINEUP);
  
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [constructors, setConstructors] = useState(INITIAL_CONSTRUCTORS);
  const [circuit, setCircuit] = useState(CURRENT_CIRCUIT);
  
  const [isSynced, setIsSynced] = useState(false);
  const [lockedDriverIds, setLockedDriverIds] = useState<string[]>([]);
  const [excludedDriverIds, setExcludedDriverIds] = useState<string[]>([]);
  const [wildcardMode, setWildcardMode] = useState(!isSynced); // Defaults to true if not synced
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSyncSquad = (manager: any) => {
    if (!manager || !manager.drivers) return;

    const selectedDIds: string[] = [];
    const selectedCIds: string[] = [];

    manager.drivers.forEach((p: any) => {
      const idStr = String(p.id);
      if (p.playerpostion <= 5) {
        if (selectedDIds.length < 5) selectedDIds.push(idStr);
      } else if (p.playerpostion <= 7) {
        const teamId = F1_RAW_CONSTRUCTOR_ID_MAP[idStr] || idStr;
        if (selectedCIds.length < 2) selectedCIds.push(teamId);
      }
    });

    const drsId = manager.captainId ? String(manager.captainId) : selectedDIds[0] || '';

    const sDrivers = drivers.filter((d) => selectedDIds.includes(d.id));
    const sConstructors = constructors.filter((c) => selectedCIds.includes(c.id));
    const dCost = sDrivers.reduce((acc, d) => acc + d.price, 0);
    const cCost = sConstructors.reduce((acc, c) => acc + c.price, 0);
    const totalC = parseFloat((dCost + cCost).toFixed(1));

    let totalXP = 0;
    sDrivers.forEach((d) => {
      totalXP += (d.id === drsId) ? d.xP * 2 : d.xP;
    });
    sConstructors.forEach((c) => {
      totalXP += c.xP;
    });

    setUserLineup({
      driverIds: selectedDIds,
      constructorIds: selectedCIds as TeamId[],
      drsBoostDriverId: drsId,
      activeChip: manager.activeChip || null,
      freeTransfers: 2,
      bankBudget: parseFloat(Math.max(0, 100.0 - totalC).toFixed(1)),
      totalCost: totalC,
      teamValue: 100.0,
      totalExpectedPoints: totalXP,
    });

    setIsSynced(true);
    setWildcardMode(false);
    setToastMessage(`⚡ Synced squad from #${manager.rank} ${manager.managerName || manager.userName} (${manager.points} pts)`);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  const [isRefreshingRaceData, setIsRefreshingRaceData] = useState(false);

  const handleRefreshRaceData = async () => {
    setIsRefreshingRaceData(true);
    setToastMessage("🔄 Pulling latest race results & prices directly from official F1 servers...");
    try {
      const res = await fetch('/api/build-history', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToastMessage("✅ Official F1 race feeds refreshed successfully! Updating views...");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setToastMessage(`❌ Failed to update race data: ${data.error || 'Server error'}`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err: any) {
      console.error('Refresh race data error:', err);
      setToastMessage("❌ Failed to reach update server. Make sure Vite dev server is running.");
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsRefreshingRaceData(false);
    }
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
    const opt = optimizeLineup(drivers, constructors, budget, lockedDriverIds, excludedDriverIds, riskMode);
    if (opt) {
      effectiveUserLineup = {
        driverIds: opt.drivers.map(d => d.id),
        constructorIds: opt.constructors.map(c => c.id),
        drsBoostDriverId: opt.drsBoostDriver?.id || opt.drivers[0]?.id || "",
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
          userLineup={derivedUserLineup}
          isSynced={isSynced}
          wildcardMode={wildcardMode}
          setWildcardMode={setWildcardMode}
        />

        {/* Left Column: Metrics & Squad Values */}
        <MetricsColumn
          userLineup={derivedUserLineup}
          setUserLineup={setUserLineup}
          drivers={drivers}
          constructors={constructors}
          riskMode={riskMode}
          setRiskMode={setRiskMode}
          lockedDriverIds={lockedDriverIds}
          setLockedDriverIds={setLockedDriverIds}
          excludedDriverIds={excludedDriverIds}
          setExcludedDriverIds={setExcludedDriverIds}
          onSyncSquad={handleSyncSquad}
          activeRound={activeRound}
          onRoundChange={setActiveRound}
          onRefreshRaceData={handleRefreshRaceData}
          isRefreshingRaceData={isRefreshingRaceData}
          setWildcardMode={setWildcardMode}
          onToast={(msg) => {
            setToastMessage(msg);
            setTimeout(() => setToastMessage(null), 4000);
          }}
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
            
            {/* Tab Pill Navigation */}
            <div className="flex items-center justify-center sm:justify-start mb-6">
              <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-fpl-border w-full sm:w-auto justify-center">
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
                    onHarUpload={handleHarUpload}
                    activeRound={activeRound}
                    onRoundChange={setActiveRound}
                    onRefreshRaceData={handleRefreshRaceData}
                    isRefreshingRaceData={isRefreshingRaceData}
                    strategyMode={riskMode}
                    setWildcardMode={setWildcardMode}
                    onToast={(msg) => {
                      setToastMessage(msg);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
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
                    strategyMode={riskMode}
                    setWildcardMode={setWildcardMode}
                    onToast={(msg) => {
                      setToastMessage(msg);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
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
                    strategyMode={riskMode}
                    onApplySquad={(driverIds, constructorIds, drsId) => {
                      setUserLineup((prev) => ({
                        ...prev,
                        driverIds,
                        constructorIds: constructorIds as TeamId[],
                        drsBoostDriverId: drsId,
                      }));
                      setWildcardMode(false);
                      setTab('paddock');
                      setToastMessage("⚡ Wildcard Squad loaded into your Paddock Grid!");
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
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

      {/* Floating Interactive Toast for Squad Synchronization */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-emerald-400 border border-emerald-500/40 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono font-bold backdrop-blur-md transition-all duration-300">
          <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;

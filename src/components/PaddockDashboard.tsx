import React, { useState } from 'react';
import type { Circuit, Driver, Constructor } from '../types/f1';
import { Shield, ArrowUpRight } from 'lucide-react';

interface PaddockDashboardProps {
  circuit: Circuit;
  drivers: Driver[];
  constructors: Constructor[];
}

export const PaddockDashboard: React.FC<PaddockDashboardProps> = ({
  circuit,
  drivers,
  constructors,
}) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(drivers[0]);

  // Sort drivers by starting grid position (P1 to P20)
  const gridDrivers = [...drivers].sort((a, b) => a.gridPosition - b.gridPosition);

  // Helper to find constructor color
  const getTeamColor = (teamId: string) => {
    const constr = constructors.find((c) => c.id === teamId);
    return constr ? constr.color : '#8a96a8';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
      
      {/* Main 20-Car Starting Grid Visualizer */}
      <div className="telemetry-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🏎️ OFFICIAL GRAND PRIX STARTING GRID</span>
              <span className="badge badge-cyan">20 CARS LOCKED</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Official grid positions post-qualifying. Highlighted yellow slots indicate high Overtake Recovery Potential (`ORP`).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--podium-gold)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--podium-gold)' }} /> Pole Position
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--warning-amber)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning-amber)' }} /> High ORP Opportunity
            </span>
          </div>
        </div>

        {/* Staggered F1 Grid Layout (P1 to P20) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
          {gridDrivers.map((driver) => {
            const teamColor = getTeamColor(driver.teamId);
            const isSelected = selectedDriver?.id === driver.id;
            const isHighORP = driver.orp >= 10.0;
            const isPole = driver.gridPosition === 1;

            return (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className={`grid-slot ${isPole ? 'grid-slot-p1' : ''} ${isHighORP ? 'grid-slot-out-of-position' : ''}`}
                style={{
                  borderLeftColor: teamColor,
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--telemetry-cyan)' : undefined,
                  boxShadow: isSelected ? '0 0 16px var(--telemetry-cyan-glow)' : undefined,
                  transform: isSelected ? 'scale(1.01)' : 'none',
                }}
              >
                {/* Grid Position Badge */}
                <div className="grid-pos-number" style={{ color: isPole ? 'var(--podium-gold)' : isHighORP ? 'var(--warning-amber)' : undefined }}>
                  P{driver.gridPosition}
                </div>

                {/* Driver Info & Team Livery */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.2px' }}>
                      {driver.shortName} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>#{driver.number}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--telemetry-cyan)' }}>
                      ${driver.price.toFixed(1)}M
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{driver.teamName}</span>
                    <span>Proj: P{driver.expectedFinish}</span>
                  </div>
                </div>

                {/* Recovery / ORP Tag */}
                {isHighORP && (
                  <span className="badge badge-amber" title={`Started P${driver.gridPosition}, expected finish P${driver.expectedFinish}`}>
                    <ArrowUpRight size={12} /> +{driver.orp.toFixed(0)} ORP
                  </span>
                )}
                {isPole && (
                  <span className="badge badge-f1">POLE</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Telemetry Sidebar: Circuit DNA & Driver Detail Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Circuit DNA Telemetry */}
        <div className="telemetry-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--telemetry-cyan)' }}>
            <Shield size={16} /> CIRCUIT DNA TELEMETRY
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            {/* Safety Car Probability */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Safety Car Probability</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: circuit.scProbability > 70 ? 'var(--warning-amber)' : 'var(--podium-green)' }}>
                  {circuit.scProbability}% RISK
                </span>
              </div>
              <div className="telemetry-progress">
                <div
                  className="telemetry-progress-fill"
                  style={{
                    width: `${circuit.scProbability}%`,
                    background: circuit.scProbability > 70 ? 'var(--warning-amber)' : 'var(--podium-green)',
                  }}
                />
              </div>
            </div>

            {/* Overtake Difficulty Rating */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overtake Rating</span>
              <span className="badge badge-cyan">{circuit.overtakeDifficulty}</span>
            </div>

            {/* Tire Degradation & Pit Lane Delta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TIRE DEG</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{circuit.tireDegradation}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PIT TIME DELTA</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--telemetry-cyan)' }}>
                  {circuit.pitLaneDeltaSec}s
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Driver Detail Inspector Card */}
        {selectedDriver && (
          <div className="telemetry-card carbon-texture" style={{ borderLeft: `4px solid ${getTeamColor(selectedDriver.teamId)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
              <div>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', marginBottom: '0.25rem' }}>
                  {selectedDriver.teamName}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedDriver.name}</h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EXPECTED xP</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--telemetry-cyan)' }}>
                  {selectedDriver.xP.toFixed(1)} pts
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>START GRID</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: selectedDriver.gridPosition > 14 ? 'var(--warning-amber)' : '#fff' }}>
                  P{selectedDriver.gridPosition}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PROJ FINISH</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--podium-green)' }}>
                  P{selectedDriver.expectedFinish}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Teammate Delta (Quali):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: selectedDriver.headToHeadVsTeammate.qualiDeltaSeconds < 0 ? 'var(--podium-green)' : 'var(--f1-red)' }}>
                  {selectedDriver.headToHeadVsTeammate.qualiDeltaSeconds > 0 ? '+' : ''}{selectedDriver.headToHeadVsTeammate.qualiDeltaSeconds.toFixed(3)}s
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Teammate Dominance (`TDI`):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff' }}>{selectedDriver.tdi.toFixed(1)} / 100</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>DNF Risk (`xDNF`):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: selectedDriver.xDnf > 10 ? 'var(--f1-red)' : 'var(--podium-green)' }}>
                  {selectedDriver.xDnf}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Effective Ownership:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--telemetry-cyan)' }}>
                  {selectedDriver.ownership}%
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

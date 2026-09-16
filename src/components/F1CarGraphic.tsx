import React from 'react';
import type { TeamId } from '../types/f1';

interface F1CarGraphicProps {
  teamId: TeamId;
  driverNumber?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TEAM_LIVERY: Record<TeamId, { primary: string; secondary: string; accent: string; dark: string }> = {
  red_bull: { primary: '#3671C6', secondary: '#CC1E4A', accent: '#FFD700', dark: '#0b1626' },
  mclaren: { primary: '#FF8000', secondary: '#111111', accent: '#00F0FF', dark: '#1f1000' },
  ferrari: { primary: '#E8002D', secondary: '#FFEB00', accent: '#000000', dark: '#240006' },
  mercedes: { primary: '#27F4D2', secondary: '#C0C0C0', accent: '#000000', dark: '#002621' },
  aston_martin: { primary: '#229971', secondary: '#CEDC00', accent: '#FFFFFF', dark: '#031f16' },
  williams: { primary: '#64C4FF', secondary: '#00205B', accent: '#FFFFFF', dark: '#000c24' },
  rb: { primary: '#6692FF', secondary: '#FFFFFF', accent: '#D1001C', dark: '#0a1638' },
  racing_bulls: { primary: '#6692FF', secondary: '#FFFFFF', accent: '#D1001C', dark: '#0a1638' },
  haas: { primary: '#B6BABD', secondary: '#E6002B', accent: '#000000', dark: '#1a1a1a' },
  sauber: { primary: '#52E252', secondary: '#000000', accent: '#FFFFFF', dark: '#072407' },
  alpine: { primary: '#0093CC', secondary: '#FF87BC', accent: '#FFFFFF', dark: '#001824' },
  audi: { primary: '#E3000F', secondary: '#000000', accent: '#FFFFFF', dark: '#1a0000' },
  cadillac: { primary: '#FFB81C', secondary: '#000000', accent: '#FFFFFF', dark: '#1a1400' },
};

export const F1CarGraphic: React.FC<F1CarGraphicProps> = ({
  teamId,
  driverNumber,
  size = 'md',
  className = '',
}) => {
  const livery = TEAM_LIVERY[teamId] || TEAM_LIVERY.mclaren;

  const width = size === 'sm' ? 120 : size === 'lg' ? 240 : 180;
  const height = size === 'sm' ? 45 : size === 'lg' ? 90 : 65;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      title={`2026 F1 Car - ${teamId.replace('_', ' ').toUpperCase()}`}
    >
      <svg
        viewBox="0 0 320 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain filter hover:brightness-110 transition-all pointer-events-none"
      >
        {/* Subtle Car Shadow */}
        <ellipse cx="160" cy="98" rx="140" ry="8" fill="#000000" fillOpacity="0.6" />

        {/* 2026 Rear Wing */}
        <path d="M 20 25 L 55 25 L 50 55 L 15 55 Z" fill={livery.secondary} />
        <path d="M 12 20 L 58 20 L 55 28 L 10 28 Z" fill={livery.primary} />
        <line x1="35" y1="28" x2="35" y2="70" stroke="#222" strokeWidth="4" />

        {/* Main Body Chassis & Monocoque */}
        <path
          d="M 35 65 C 50 45, 80 38, 120 38 C 160 38, 200 48, 255 60 L 295 72 C 305 75, 308 82, 290 84 L 230 84 C 180 84, 100 84, 35 80 Z"
          fill={livery.primary}
        />

        {/* Engine Cover & Sidepods */}
        <path d="M 70 42 C 90 42, 130 45, 175 58 L 180 75 L 70 75 Z" fill={livery.dark} />
        <path d="M 110 46 C 140 46, 170 54, 200 65 L 205 76 L 105 76 Z" fill={livery.secondary} opacity="0.8" />

        {/* Cockpit & 2026 Safety Halo Bar */}
        <path d="M 135 48 C 145 32, 165 32, 180 48 Z" fill="#111111" />
        <path d="M 130 46 C 150 28, 175 28, 190 46" fill="none" stroke={livery.accent} strokeWidth="4.5" strokeLinecap="round" />

        {/* Front Wing Assembly */}
        <path d="M 270 78 L 315 80 L 310 88 L 265 85 Z" fill={livery.primary} />
        <path d="M 290 70 L 318 72 L 316 88 L 288 86 Z" fill={livery.secondary} />

        {/* Driver Helmet */}
        <circle cx="155" cy="40" r="7" fill={livery.accent} stroke="#000" strokeWidth="1.5" />
        <path d="M 155 37 L 161 40 L 155 43 Z" fill="#00f0ff" />

        {/* Rear Wheel & Pirelli Tire (Soft Red Rim Accent) */}
        <g>
          <circle cx="70" cy="78" r="22" fill="#151515" stroke="#333" strokeWidth="3" />
          <circle cx="70" cy="78" r="14" fill="#222" />
          <circle cx="70" cy="78" r="14" fill="none" stroke="#E10600" strokeWidth="2.5" />
          <circle cx="70" cy="78" r="5" fill={livery.accent} />
        </g>

        {/* Front Wheel & Pirelli Tire */}
        <g>
          <circle cx="245" cy="78" r="22" fill="#151515" stroke="#333" strokeWidth="3" />
          <circle cx="245" cy="78" r="14" fill="#222" />
          <circle cx="245" cy="78" r="14" fill="none" stroke="#E10600" strokeWidth="2.5" />
          <circle cx="245" cy="78" r="5" fill={livery.accent} />
        </g>

        {/* Driver Number Badge on Engine Cover */}
        {driverNumber && (
          <text
            x="100"
            y="64"
            fill="#FFFFFF"
            fontSize="18"
            fontWeight="900"
            fontFamily="monospace"
            fontStyle="italic"
            opacity="0.9"
          >
            #{driverNumber}
          </text>
        )}
      </svg>
    </div>
  );
};

import React, { useState } from 'react';
import type { TeamId } from '../types/f1';

// Real Official Formula 1 Media CDN PNG Cutout URLs
const OFFICIAL_F1_CAR_IMAGES: Record<TeamId, string> = {
  mclaren: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/mclaren.png',
  red_bull: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/redbull.png',
  ferrari: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/ferrari.png',
  mercedes: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/mercedes.png',
  aston_martin: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/astonmartin.png',
  williams: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/williams.png',
  rb: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/rb.png',
  haas: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/haas.png',
  sauber: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/sauber.png',
  alpine: 'https://media.formula1.com/image/upload/v1740000000/fom-website/2026/cars/alpine.png',
};

// Fallback high-resolution car cutout renders
const OFFICIAL_F1_CAR_FALLBACKS: Record<TeamId, string> = {
  mclaren: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/mclaren_side.png',
  red_bull: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/redbull_side.png',
  ferrari: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/ferrari_side.png',
  mercedes: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/mercedes_side.png',
  aston_martin: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/astonmartin_side.png',
  williams: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/williams_side.png',
  rb: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/rb_side.png',
  haas: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/haas_side.png',
  sauber: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/sauber_side.png',
  alpine: 'https://raw.githubusercontent.com/f1-data/assets/main/2026/cars/alpine_side.png',
};

// Team Color Tokens
const TEAM_COLORS: Record<TeamId, { primary: string; secondary: string }> = {
  mclaren: { primary: '#FF8000', secondary: '#111111' },
  red_bull: { primary: '#3671C6', secondary: '#CC1E4A' },
  ferrari: { primary: '#E8002D', secondary: '#FFEB00' },
  mercedes: { primary: '#27F4D2', secondary: '#C0C0C0' },
  aston_martin: { primary: '#229971', secondary: '#CEDC00' },
  williams: { primary: '#64C4FF', secondary: '#00205B' },
  rb: { primary: '#6692FF', secondary: '#FFFFFF' },
  haas: { primary: '#B6BABD', secondary: '#E6002B' },
  sauber: { primary: '#52E252', secondary: '#000000' },
  alpine: { primary: '#0093CC', secondary: '#FF87BC' },
};

interface F1CarPhotoProps {
  teamId: TeamId;
  driverNumber?: number;
  driverName?: string;
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * HD Real F1 Car & Constructor Photo Component.
 * Fetches official high-res PNG transparent car cutouts from Formula1.com CDN,
 * with fallback SVG rendering matching FPL's PlayerPhoto architecture.
 */
export const F1CarPhoto: React.FC<F1CarPhotoProps> = ({
  teamId,
  driverNumber,
  driverName = '',
  className = '',
  imgClassName = '',
  size = 'md',
}) => {
  const [stage, setStage] = useState<'primary' | 'fallback' | 'vector'>('primary');

  const primaryUrl = OFFICIAL_F1_CAR_IMAGES[teamId] || OFFICIAL_F1_CAR_IMAGES.mclaren;
  const fallbackUrl = OFFICIAL_F1_CAR_FALLBACKS[teamId] || OFFICIAL_F1_CAR_FALLBACKS.mclaren;
  const colors = TEAM_COLORS[teamId] || { primary: '#FF8000', secondary: '#111111' };

  const heightClass = size === 'sm' ? 'h-10' : size === 'lg' ? 'h-24' : 'h-16';

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${heightClass} w-full overflow-hidden ${className}`}
      title={`${driverName} - ${teamId.replace('_', ' ').toUpperCase()}`}
    >
      {stage === 'primary' ? (
        <img
          src={primaryUrl}
          alt={`F1 Car ${teamId}`}
          onError={() => setStage('fallback')}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain filter hover:brightness-110 transition-all pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] ${imgClassName}`}
        />
      ) : stage === 'fallback' ? (
        <img
          src={fallbackUrl}
          alt={`F1 Car ${teamId}`}
          onError={() => setStage('vector')}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain filter hover:brightness-110 transition-all pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] ${imgClassName}`}
        />
      ) : (
        /* Dynamic Styling Fallback Cutout Badge */
        <div className="w-full h-full flex items-center justify-center p-1">
          <svg viewBox="0 0 200 60" className="w-full h-full object-contain">
            <path
              d="M 10 40 L 40 15 L 120 15 L 180 40 L 190 48 L 10 48 Z"
              fill={colors.primary}
              stroke={colors.secondary}
              strokeWidth="2"
            />
            <circle cx="45" cy="48" r="10" fill="#111" stroke={colors.secondary} strokeWidth="2" />
            <circle cx="155" cy="48" r="10" fill="#111" stroke={colors.secondary} strokeWidth="2" />
            {driverNumber && (
              <text x="90" y="35" fill="#fff" fontSize="14" fontWeight="900" fontFamily="monospace">
                #{driverNumber}
              </text>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

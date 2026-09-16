import React, { useState } from 'react';
import type { TeamId } from '../types/f1';

// Official 2026 Formula 1 Fantasy CDN Driver Headshot Front Portraits
const OFFICIAL_F1_DRIVER_PHOTOS: Record<string, { url: string; teamRgb: string }> = {
  ver: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:3671c6/v1740000001/common/f1/2026/redbullracing/maxver01/2026redbullracingmaxver01front.png',
    teamRgb: '3671c6',
  },
  nor: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:ff8000/v1772802140/common/f1/2026/mclaren/lannor01/2026mclarenlannor01front.png',
    teamRgb: 'ff8000',
  },
  pia: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:ff8000/v1772802140/common/f1/2026/mclaren/oscpia01/2026mclarenoscpia01front.png',
    teamRgb: 'ff8000',
  },
  lec: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:e8002d/v1772802140/common/f1/2026/ferrari/chalec01/2026ferrarichalec01front.png',
    teamRgb: 'e8002d',
  },
  ham: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:e8002d/v1772802140/common/f1/2026/ferrari/lewham01/2026ferrarilewham01front.png',
    teamRgb: 'e8002d',
  },
  rus: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:00d7b6/v1772802140/common/f1/2026/mercedes/georus01/2026mercedesgeorus01front.png',
    teamRgb: '00d7b6',
  },
  ant: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:00d7b6/v1772802140/common/f1/2026/mercedes/andant01/2026mercedesandant01front.png',
    teamRgb: '00d7b6',
  },
  sai: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:1868db/v1772802140/common/f1/2026/williams/carsai01/2026williamscarsai01front.png',
    teamRgb: '1868db',
  },
  alb: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:1868db/v1772802140/common/f1/2026/williams/alealb01/2026williamsalealb01front.png',
    teamRgb: '1868db',
  },
  hul: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:F50537/v1772802140/common/f1/2026/audi/nichul01/2026audinichul01front.png',
    teamRgb: 'F50537',
  },
  bor: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:F50537/v1772802140/common/f1/2026/audi/gabbor01/2026audigabbor01front.png',
    teamRgb: 'F50537',
  },
  bot: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:909090/v1772802140/common/f1/2026/cadillac/valbot01/2026cadillacvalbot01front.png',
    teamRgb: '909090',
  },
  alo: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:229971/v1772802140/common/f1/2026/astonmartin/feralo01/2026astonmartinferalo01front.png',
    teamRgb: '229971',
  },
  tsu: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:6c98ff/v1772802140/common/f1/2026/racingbulls/yuktsu01/2026racingbullsyuktsu01front.png',
    teamRgb: '6c98ff',
  },
  bea: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:b6babd/v1772802140/common/f1/2026/haas/olibea01/2026haasolibea01front.png',
    teamRgb: 'b6babd',
  },
  gas: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:0093cc/v1772802140/common/f1/2026/alpine/piegas01/2026alpinepiegas01front.png',
    teamRgb: '0093cc',
  },
  law: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:6c98ff/v1772802140/common/f1/2026/racingbulls/lialaw01/2026racingbullslialaw01front.png',
    teamRgb: '6c98ff',
  },
  per: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:FFB81C/v1704987309/common/f1/2024/redbullracing/serper01/2024redbullracingserper01front.png',
    teamRgb: 'FFB81C',
  },
  oco: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:b6babd/v1704987309/common/f1/2024/alpine/estoco01/2024alpineestoco01front.png',
    teamRgb: 'b6babd',
  },
  str: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:229971/v1704987309/common/f1/2024/astonmartin/lanstr01/2024astonmartinlanstr01front.png',
    teamRgb: '229971',
  },
  col: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:0093cc/v1725357948/common/f1/2024/williams/fracol01/2024williamsfracol01front.png',
    teamRgb: '0093cc',
  },
  had: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:3671c6/v1704987309/common/f1/2024/alphatauri/isahad01/2024alphatauriisahad01front.png',
    teamRgb: '3671c6',
  },
  lin: {
    url: 'https://media.formula1.com/image/upload/ar_16:9,c_crop,g_north/b_rgb:6c98ff/v1704987309/common/f1/2024/generic/generic01/2024generic01front.png',
    teamRgb: '6c98ff',
  },
};

// Official 2026 Formula 1 Fantasy CDN Constructor Real Car Right Cutouts
const OFFICIAL_F1_CONSTRUCTOR_CAR_PHOTOS: Record<TeamId, { url: string; teamRgb: string }> = {
  mercedes: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:00d7b6/v1772802140/common/f1/2026/mercedes/2026mercedescarright.png',
    teamRgb: '00d7b6',
  },
  rb: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:6c98ff/v1772802140/common/f1/2026/racingbulls/2026racingbullscarright.png',
    teamRgb: '6c98ff',
  },
  racing_bulls: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:6c98ff/v1772802140/common/f1/2026/racingbulls/2026racingbullscarright.png',
    teamRgb: '6c98ff',
  },
  mclaren: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:ff8000/v1772802140/common/f1/2026/mclaren/2026mclarencarright.png',
    teamRgb: 'ff8000',
  },
  red_bull: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:3671c6/v1772802140/common/f1/2026/redbull/2026redbullcarright.png',
    teamRgb: '3671c6',
  },
  ferrari: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:e8002d/v1772802140/common/f1/2026/ferrari/2026ferraricarright.png',
    teamRgb: 'e8002d',
  },
  williams: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:1868db/v1772802140/common/f1/2026/williams/2026williamscarright.png',
    teamRgb: '1868db',
  },
  aston_martin: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:229971/v1772802140/common/f1/2026/astonmartin/2026astonmartincarright.png',
    teamRgb: '229971',
  },
  sauber: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:F50537/v1772802140/common/f1/2026/audi/2026audicarright.png',
    teamRgb: 'F50537',
  },
  audi: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:F50537/v1772802140/common/f1/2026/audi/2026audicarright.png',
    teamRgb: 'F50537',
  },
  haas: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:b6babd/v1772802140/common/f1/2026/haas/2026haascarright.png',
    teamRgb: 'b6babd',
  },
  alpine: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:0093cc/v1772802140/common/f1/2026/alpine/2026alpinecarright.png',
    teamRgb: '0093cc',
  },
  cadillac: {
    url: 'https://media.formula1.com/image/upload/c_scale,w_2000/c_lpad,h_900,w_2100/b_rgb:FFB81C/v1772802140/common/f1/2026/cadillac/2026cadillaccarright.png',
    teamRgb: 'FFB81C',
  },
};

interface F1AssetPhotoProps {
  type: 'driver' | 'constructor';
  driverId?: string;
  driverShortName?: string;
  teamId?: TeamId;
  name: string;
  className?: string;
  imgClassName?: string;
}

export const F1AssetPhoto: React.FC<F1AssetPhotoProps> = ({
  type,
  driverId = '',
  driverShortName = '',
  teamId = 'mclaren',
  name,
  className = '',
  imgClassName = '',
}) => {
  const [failed, setFailed] = useState(false);

  let photoUrl = '';
  let teamBgRgb = '3671c6';

  const lookupKey = driverShortName ? driverShortName.toLowerCase() : driverId;

  if (type === 'driver' && OFFICIAL_F1_DRIVER_PHOTOS[lookupKey]) {
    photoUrl = OFFICIAL_F1_DRIVER_PHOTOS[lookupKey].url;
    teamBgRgb = OFFICIAL_F1_DRIVER_PHOTOS[lookupKey].teamRgb;
  } else if (OFFICIAL_F1_CONSTRUCTOR_CAR_PHOTOS[teamId]) {
    photoUrl = OFFICIAL_F1_CONSTRUCTOR_CAR_PHOTOS[teamId].url;
    teamBgRgb = OFFICIAL_F1_CONSTRUCTOR_CAR_PHOTOS[teamId].teamRgb;
  }

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl ${className}`}
      style={{ backgroundColor: `#${teamBgRgb}` }}
      title={name}
    >
      {!failed && photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          onError={() => setFailed(true)}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-contain pointer-events-none ${imgClassName}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-black font-mono text-sm uppercase">
          {name.slice(0, 3)}
        </div>
      )}
    </div>
  );
};

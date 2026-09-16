import type { Driver, Constructor } from '../types/f1';
import { INITIAL_DRIVERS, INITIAL_CONSTRUCTORS } from '../data/f1Data';

/**
 * OpenF1 API & Jolpica Ergast F1 API Integration
 * OpenF1 API Base: https://api.openf1.org/v1
 * Jolpica F1 API Base: https://api.jolpica.net/f1
 */

const JOLPICA_F1_BASE = 'https://api.jolpica.net/f1';

export async function fetchLiveF1Drivers(): Promise<Driver[]> {
  try {
    // 1. Attempt fetching live driver standings & qualifying grid from Jolpica F1 API
    const response = await fetch(`${JOLPICA_F1_BASE}/2026/driverstandings.json`);
    if (response.ok) {
      const data = await response.json();
      const standingsList = data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;

      if (Array.isArray(standingsList) && standingsList.length > 0) {
        console.log('[F1 API Service] Successfully fetched live driver standings from Jolpica F1 API!');
        // Enrich local driver models with live standings & points
        return INITIAL_DRIVERS.map((d) => {
          const liveMatch = standingsList.find(
            (item: any) =>
              item.Driver?.code?.toUpperCase() === d.shortName.toUpperCase() ||
              item.Driver?.familyName?.toLowerCase().includes(d.name.split(' ').pop()?.toLowerCase() || '')
          );

          if (liveMatch) {
            return {
              ...d,
              totalPoints: Number(liveMatch.points) || d.totalPoints,
              seasonRank: Number(liveMatch.position) || d.seasonRank,
            };
          }
          return d;
        });
      }
    }
  } catch (err) {
    console.warn('[F1 API Service] Live F1 endpoint notice (using local paddock dataset):', err);
  }

  // Fallback to local high-precision paddock dataset
  return INITIAL_DRIVERS;
}

export async function fetchLiveF1Constructors(): Promise<Constructor[]> {
  try {
    const response = await fetch(`${JOLPICA_F1_BASE}/2026/constructorstandings.json`);
    if (response.ok) {
      const data = await response.json();
      const standings = data.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;

      if (Array.isArray(standings) && standings.length > 0) {
        console.log('[F1 API Service] Successfully fetched live constructor standings from Jolpica F1 API!');
        return INITIAL_CONSTRUCTORS.map((c) => {
          const match = standings.find((item: any) =>
            item.Constructor?.name?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
          );
          if (match) {
            return {
              ...c,
              totalPoints: Number(match.points) || c.totalPoints,
            };
          }
          return c;
        });
      }
    }
  } catch (err) {
    console.warn('[F1 API Service] Live Constructor API notice:', err);
  }

  return INITIAL_CONSTRUCTORS;
}

import { LevelData } from '../../types';
export { ALL_100_LEVELS, type LevelCatalogItem } from './allLevelsCatalog';

// Dynamically import all 100 levels across all world directories using Vite's eager glob import
const levelModules = (import.meta as any).glob('./**/*.json', { eager: true });

export const registeredLevels: Record<number, LevelData> = {};

for (const path in levelModules) {
  const mod = levelModules[path] as any;
  const data: LevelData = (mod.default || mod) as LevelData;
  if (data && typeof data.id === 'number') {
    registeredLevels[data.id] = data;
  }
}

export const TOTAL_LEVELS_BUILT = Object.keys(registeredLevels).length;
export const TOTAL_PLANNED_LEVELS = 100;

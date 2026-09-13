import { getDailyLevel } from './src/engine/levelLoader';
import { registeredLevels } from './src/data/levels';

console.log("Total levels:", Object.keys(registeredLevels).length);
try {
  const level = getDailyLevel('2026-09-13');
  console.log("Success! Level ID:", level.level.id);
} catch (e) {
  console.error("Error:", e);
}

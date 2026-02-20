export type CharacterType =
  | 'warrior'
  | 'scholar'
  | 'monk'
  | 'envoy'
  | 'artisan'
  | 'mystic'
  | 'soldier'
  | 'inventor'
  | 'visionary'
  | 'egg';

export type CharacterStage = 'egg' | 'child' | 'adult' | 'master';

export interface StatValues {
  strength: number;
  intellect: number;
  discipline: number;
  charisma: number;
  creativity: number;
  spirituality: number;
}

export function getCharacterStage(level: number): CharacterStage {
  if (level < 5) return 'egg';
  if (level < 15) return 'child';
  if (level < 30) return 'adult';
  return 'master';
}

export function getNextEvolutionLevel(level: number): number | null {
  if (level < 5) return 5;
  if (level < 15) return 15;
  if (level < 30) return 30;
  return null;
}

export function getCharacterType(stats: StatValues, level: number): CharacterType {
  if (level < 5) return 'egg';

  const ranked = (Object.entries(stats) as [keyof StatValues, number][])
    .sort(([, a], [, b]) => b - a);

  const [first, second] = ranked;
  const firstName = first[0];
  const firstXP = first[1];
  const secondName = second[0];
  const secondXP = second[1];

  function isCombo(
    a: keyof StatValues,
    b: keyof StatValues,
    matchA: keyof StatValues,
    matchB: keyof StatValues
  ): boolean {
    const pairMatch =
      (a === matchA && b === matchB) || (a === matchB && b === matchA);
    if (!pairMatch) return false;
    return secondXP >= firstXP * 0.8;
  }

  if (isCombo(firstName, secondName, 'strength', 'discipline'))  return 'soldier';
  if (isCombo(firstName, secondName, 'intellect', 'creativity')) return 'inventor';
  if (isCombo(firstName, secondName, 'charisma', 'creativity'))  return 'visionary';

  const pureMap: Record<keyof StatValues, CharacterType> = {
    strength:     'warrior',
    intellect:    'scholar',
    discipline:   'monk',
    charisma:     'envoy',
    creativity:   'artisan',
    spirituality: 'mystic',
  };

  return pureMap[firstName];
}

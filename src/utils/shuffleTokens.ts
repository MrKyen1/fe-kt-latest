/**
 * Shuffles an array deterministically using a string seed (e.g. questionId or attemptId),
 * and guarantees that the output is not identical to the input if length > 1.
 */
export function shuffleTokensWithSeed<T = string>(tokens: T[], seedStr: string = "default"): T[] {
  if (!tokens || tokens.length <= 1) return [...(tokens || [])];

  // String hash to initialize pseudo-random seed
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  let seed = Math.abs(hash) || 123456789;

  // LCG pseudo-random generator
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const result = [...tokens];
  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  // Ensure it's not identical to the original order (if possible)
  const isIdentical = result.every((val, idx) => {
    const a = typeof val === "string" ? val : (val as any)?.id || (val as any)?.content;
    const b = typeof tokens[idx] === "string" ? tokens[idx] : (tokens[idx] as any)?.id || (tokens[idx] as any)?.content;
    return a === b;
  });

  if (isIdentical && result.length > 1) {
    const firstDiffIdx = result.findIndex((val) => {
      const a = typeof val === "string" ? val : (val as any)?.id || (val as any)?.content;
      const b = typeof result[0] === "string" ? result[0] : (result[0] as any)?.id || (result[0] as any)?.content;
      return a !== b;
    });
    if (firstDiffIdx !== -1) {
      [result[0], result[firstDiffIdx]] = [result[firstDiffIdx], result[0]];
    }
  }

  return result;
}

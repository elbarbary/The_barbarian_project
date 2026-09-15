/** Saved documents may arrive across a deployment. Never join different runs. */
export function readingProblem(reading, scenarios, key) {
  if (!reading) return null;
  if (reading.key !== key || reading.basisSession !== scenarios?.basisSession) return 'run';
  if (scenarios.publicationId && reading.publicationId !== scenarios.publicationId) return 'snapshot';
  if (!reading.scores || typeof reading.scores !== 'object' || Array.isArray(reading.scores)) return 'scores';
  if (Object.values(reading.scores).some(v => typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100)) return 'scores';
  return null;
}

export function mixedSnapshot(...documents) {
  const present = documents.filter(Boolean);
  const ids = present.map(d => d.publicationId);
  return ids.some(Boolean) && (ids.some(id => !id) || new Set(ids).size > 1);
}

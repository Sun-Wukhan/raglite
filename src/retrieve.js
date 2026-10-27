// Retrieval: rank indexed chunks against a query vector by cosine
// similarity and return the best matches with their citation metadata.

export function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Returns up to k results: [{ score, file, heading, startLine, text }],
// highest score first.
export function search(index, queryVector, k = 5) {
  return index.chunks
    .map((chunk) => ({
      score: cosineSimilarity(queryVector, chunk.embedding),
      file: chunk.file,
      heading: chunk.heading,
      startLine: chunk.startLine,
      text: chunk.text,
    }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}

// Human-readable citation, e.g. "kubernetes-notes.md § Pods (line 3)".
export function formatCitation(result) {
  const parts = [result.file];
  if (result.heading) parts.push(`§ ${result.heading}`);
  parts.push(`(line ${result.startLine})`);
  return parts.join(' ');
}

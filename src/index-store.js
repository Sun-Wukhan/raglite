// The index is a single JSON file: chunk metadata plus one embedding
// vector per chunk. Small on purpose — this is a notes-scale tool.

import { readFile, writeFile } from 'node:fs/promises';
import { chunkDocument } from './chunk.js';

export const INDEX_FILE = 'raglite-index.json';

// docs: [{ file, text }] — embed: async (texts) => vectors.
// Returns the index object (not yet saved).
export async function buildIndex(docs, embed, { model = 'stub', chunkOptions } = {}) {
  const chunks = [];
  for (const doc of docs) {
    for (const chunk of chunkDocument(doc.text, chunkOptions)) {
      chunks.push({ file: doc.file, ...chunk });
    }
  }
  const vectors = chunks.length ? await embed(chunks.map((c) => c.text)) : [];
  chunks.forEach((chunk, i) => {
    chunk.embedding = vectors[i];
  });
  return {
    version: 1,
    model,
    createdAt: new Date().toISOString(),
    chunks,
  };
}

export async function saveIndex(index, path = INDEX_FILE) {
  await writeFile(path, JSON.stringify(index), 'utf8');
}

export async function loadIndex(path = INDEX_FILE) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    throw new Error(
      `No index found at ${path}. Run "raglite index <dir>" first.`
    );
  }
  return JSON.parse(raw);
}

// Local embeddings with an open-weight model via Transformers.js.
//
// The model (all-MiniLM-L6-v2, by Sentence Transformers, distributed in ONNX
// form by Xenova) is downloaded once on first use and then runs entirely
// offline on CPU. No API keys, no network calls at query time.

import { pipeline } from '@xenova/transformers';

export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise = null;

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID);
  }
  return extractorPromise;
}

// Returns an embed function: async (texts: string[]) => number[][].
// Embeddings are mean-pooled and L2-normalised by the pipeline.
export async function createEmbedder() {
  const extractor = await getExtractor();
  return async function embed(texts) {
    const vectors = [];
    for (const text of texts) {
      const result = await extractor(text, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(result.data));
    }
    return vectors;
  };
}

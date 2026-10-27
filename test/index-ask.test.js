import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex, saveIndex, loadIndex } from '../src/index-store.js';
import { search } from '../src/retrieve.js';
import { ollamaAvailable } from '../src/ollama.js';

// A deterministic stub embedder: bag-of-words hashed into 128 dimensions.
// Texts that share words land close together, which is all the ranking
// tests need — no model download in the test suite.
function stubEmbed(texts) {
  const DIM = 1024;
  return texts.map((text) => {
    const vec = new Array(DIM).fill(0);
    for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!word) continue;
      // FNV-1a over the whole word, so distinct words rarely collide.
      let h = 0x811c9dc5;
      for (const ch of word) {
        h ^= ch.charCodeAt(0);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      vec[h % DIM] += 1;
    }
    return vec;
  });
}

const DOCS = [
  {
    file: 'kubernetes.md',
    text: '# Kubernetes\n\nPods run containers. A deployment manages replicas and rollouts. Use kubectl to inspect the cluster.',
  },
  {
    file: 'sourdough.md',
    text: '# Sourdough\n\nFeed the starter with flour and water. Bulk fermentation takes hours. Bake in a Dutch oven.',
  },
  {
    file: 'networking.md',
    text: '# Networking\n\nA mesh router fixes wifi dead zones. Put iot devices on a separate vlan for safety.',
  },
];

test('index + ask: the topically right passage ranks first', async () => {
  const index = await buildIndex(DOCS, stubEmbed, { model: 'stub' });
  assert.equal(index.chunks.length, 3);

  const [q1] = await stubEmbed(['how do I restart a deployment with kubectl?']);
  assert.equal(search(index, q1, 1)[0].file, 'kubernetes.md');

  const [q2] = await stubEmbed(['feeding my sourdough starter with flour']);
  assert.equal(search(index, q2, 1)[0].file, 'sourdough.md');

  const [q3] = await stubEmbed(['wifi dead zones and mesh router placement']);
  assert.equal(search(index, q3, 1)[0].file, 'networking.md');
});

test('index round-trips through save/load unchanged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'raglite-test-'));
  try {
    const path = join(dir, 'index.json');
    const index = await buildIndex(DOCS, stubEmbed, { model: 'stub' });
    await saveIndex(index, path);
    const loaded = await loadIndex(path);
    assert.equal(loaded.chunks.length, index.chunks.length);
    assert.deepEqual(loaded.chunks[0].embedding, index.chunks[0].embedding);
    assert.equal(loaded.model, 'stub');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('loadIndex on a missing file gives an actionable error', async () => {
  await assert.rejects(() => loadIndex('/nonexistent/raglite-index.json'), /Run "raglite index/);
});

test('ollamaAvailable is false when the server cannot be reached', async () => {
  const failingFetch = async () => {
    throw new Error('connect ECONNREFUSED');
  };
  assert.equal(await ollamaAvailable(failingFetch, 100), false);
  const okFetch = async () => ({ ok: true });
  assert.equal(await ollamaAvailable(okFetch, 100), true);
});

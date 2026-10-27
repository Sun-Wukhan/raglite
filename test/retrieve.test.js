import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, search, formatCitation } from '../src/retrieve.js';

test('cosine similarity: identical, orthogonal, opposite, zero', () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [-1, 0]) + 1) < 1e-9);
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test('cosine similarity rejects mismatched lengths', () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]), /length mismatch/);
});

test('search ranks the closest vector first and respects k', () => {
  const index = {
    chunks: [
      { file: 'a.md', heading: 'A', startLine: 1, text: 'far', embedding: [0, 1] },
      { file: 'b.md', heading: 'B', startLine: 5, text: 'near', embedding: [0.9, 0.1] },
      { file: 'c.md', heading: null, startLine: 9, text: 'mid', embedding: [0.5, 0.5] },
    ],
  };
  const results = search(index, [1, 0], 2);
  assert.equal(results.length, 2);
  assert.equal(results[0].text, 'near');
  assert.equal(results[1].text, 'mid');
  assert.ok(results[0].score > results[1].score);
});

test('formatCitation includes file, heading and line', () => {
  assert.equal(
    formatCitation({ file: 'notes.md', heading: 'Pods', startLine: 3 }),
    'notes.md § Pods (line 3)'
  );
  assert.equal(
    formatCitation({ file: 'notes.md', heading: null, startLine: 1 }),
    'notes.md (line 1)'
  );
});

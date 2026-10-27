import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkDocument } from '../src/chunk.js';

test('splits on headings and records heading + start line', () => {
  const doc = [
    '# Title', // line 1
    '',
    'Intro paragraph.', // line 3
    '',
    '## Section A', // line 5
    '',
    'Alpha text.', // line 7
  ].join('\n');
  const chunks = chunkDocument(doc);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].heading, 'Title');
  assert.equal(chunks[0].startLine, 3);
  assert.equal(chunks[0].text, 'Intro paragraph.');
  assert.equal(chunks[1].heading, 'Section A');
  assert.equal(chunks[1].startLine, 7);
  assert.equal(chunks[1].text, 'Alpha text.');
});

test('content before the first heading has a null heading', () => {
  const chunks = chunkDocument('Loose text with no heading.');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].heading, null);
  assert.equal(chunks[0].startLine, 1);
});

test('paragraphs are packed but never exceed maxChars across a heading', () => {
  const para = 'x'.repeat(100);
  const doc = `# H\n\n${para}\n\n${para}\n\n${para}`;
  const chunks = chunkDocument(doc, { maxChars: 250 });
  // Two 100-char paragraphs fit in 250; the third starts a new chunk,
  // seeded with the previous chunk's last paragraph as overlap.
  assert.ok(chunks.length >= 2);
  for (const c of chunks) assert.ok(c.text.length <= 250 + 102, `chunk too long: ${c.text.length}`);
  assert.ok(chunks.every((c) => c.heading === 'H'));
});

test('a chunk never spans two headings', () => {
  const doc = '# A\n\nshort\n\n# B\n\nshort';
  const chunks = chunkDocument(doc, { maxChars: 5000 });
  assert.equal(chunks.length, 2);
  assert.deepEqual(chunks.map((c) => c.heading), ['A', 'B']);
});

test('an oversized paragraph is hard-split with overlap', () => {
  const long = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
  const chunks = chunkDocument(long, { maxChars: 200, overlapChars: 50 });
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.text.length <= 200);
  // The second piece starts 150 chars in (200 - 50 overlap), so its first
  // characters also appear near the end of the first piece.
  assert.ok(chunks[0].text.includes(chunks[1].text.slice(0, 20)));
});

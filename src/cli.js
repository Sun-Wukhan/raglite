#!/usr/bin/env node
// raglite — a tiny local RAG engine for markdown notes.
//
//   raglite index <dir>            index a folder of .md/.txt files
//   raglite ask "<question>"       retrieve the most relevant passages
//   raglite ask --llm "<question>" also generate an answer via local Ollama
//                                  (falls back to passages if unavailable)

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createEmbedder, MODEL_ID } from './embed.js';
import { buildIndex, saveIndex, loadIndex, INDEX_FILE } from './index-store.js';
import { search, formatCitation } from './retrieve.js';
import { ollamaAvailable, ollamaGenerate, ollamaModel, groundedPrompt } from './ollama.js';

const TOP_K = 5;

async function collectDocs(dir, root = dir) {
  const docs = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      docs.push(...(await collectDocs(path, root)));
    } else if (/\.(md|txt)$/i.test(entry.name)) {
      docs.push({ file: relative(root, path), text: await readFile(path, 'utf8') });
    }
  }
  return docs;
}

async function cmdIndex(dir) {
  if (!dir) throw new Error('Usage: raglite index <dir>');
  const docs = await collectDocs(dir);
  if (!docs.length) throw new Error(`No .md or .txt files found under ${dir}`);
  console.log(`Indexing ${docs.length} file(s) from ${dir} ...`);
  const embed = await createEmbedder();
  const index = await buildIndex(docs, embed, { model: MODEL_ID });
  await saveIndex(index);
  console.log(
    `Indexed ${index.chunks.length} passage(s) from ${docs.length} file(s) -> ${INDEX_FILE}`
  );
}

function printPassages(results) {
  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] ${formatCitation(r)}  (score ${r.score.toFixed(3)})`);
    console.log(r.text);
  });
}

async function cmdAsk(question, { llm }) {
  if (!question) throw new Error('Usage: raglite ask [--llm] "<question>"');
  const index = await loadIndex();
  const embed = await createEmbedder();
  const [queryVector] = await embed([question]);
  const results = search(index, queryVector, TOP_K);
  if (!results.length) {
    console.log('The index is empty — nothing to retrieve.');
    return;
  }

  if (llm) {
    if (await ollamaAvailable()) {
      try {
        const answer = await ollamaGenerate(groundedPrompt(question, results));
        console.log(answer);
        console.log('\nSources:');
        results.forEach((r, i) => console.log(`[${i + 1}] ${formatCitation(r)}`));
        return;
      } catch (err) {
        console.log(
          `\nOllama generation failed (${err.message}); showing retrieved passages instead.`
        );
      }
    } else {
      console.log(
        `\nNo local Ollama server reachable, so no generated answer ` +
          `(model ${ollamaModel()}). Showing retrieved passages instead.`
      );
    }
  }

  console.log(`Top ${results.length} passage(s) for: ${question}`);
  printPassages(results);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (command === 'index') {
      await cmdIndex(rest[0]);
    } else if (command === 'ask') {
      const llm = rest.includes('--llm');
      const question = rest.filter((a) => a !== '--llm').join(' ');
      await cmdAsk(question, { llm });
    } else {
      console.log(
        [
          'raglite — a tiny local RAG engine for markdown notes',
          '',
          'Usage:',
          '  raglite index <dir>             Index a folder of .md/.txt files',
          '  raglite ask "<question>"        Retrieve the most relevant passages',
          '  raglite ask --llm "<question>"  Also generate an answer via local Ollama',
          '                                  (falls back to passages if Ollama is down)',
        ].join('\n')
      );
      if (command && command !== '--help' && command !== '-h') process.exitCode = 1;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

main();

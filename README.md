# raglite

A tiny local RAG (retrieval-augmented generation) engine for your own
markdown notes. Point it at a folder of `.md` / `.txt` files, ask questions,
and get back the most relevant passages from your notes — with citations —
without anything leaving your machine.

Built by Navid Khan, a platform and DevOps engineering leader, as a small,
readable reference implementation of the retrieval half of RAG.

## What it does

- Indexes a folder of markdown/text notes into passages (chunks split on
  headings and paragraphs).
- Embeds every passage locally with an **open-weight embedding model** and
  stores the vectors in a plain JSON index file.
- Answers a question by retrieving the passages whose embeddings are
  closest to the question's embedding (cosine similarity) and printing
  them with source citations: file, section heading, and line number.
- Optionally — only if you run a local [Ollama](https://ollama.com) server —
  generates a written answer from those passages using an open-weight
  chat model. Without Ollama it simply shows the passages; it never fails
  just because the LLM is absent.

No API keys. No accounts. After a one-time model download, everything runs
offline.

## Open-source AI tooling

- **Embeddings:** `all-MiniLM-L6-v2` (Sentence Transformers, open weights),
  run locally via [Transformers.js](https://github.com/xenova/transformers.js)
  (`@xenova/transformers`), the JavaScript port of Hugging Face Transformers.
- **Generation (optional):** any open-weight chat model served by
  [Ollama](https://ollama.com) — `llama3.2` by default, override with the
  `RAGLITE_MODEL` environment variable.

## Install and run

Requires Node.js 18 or newer.

```sh
npm install

# Index the bundled sample notes (or any folder of your own)
node src/cli.js index ./examples

# Ask questions — extractive answers with citations
node src/cli.js ask "How do I restart a failed pod?"
node src/cli.js ask "How often should I feed my sourdough starter?"

# Optional: generated answers, if you have Ollama running locally
node src/cli.js ask --llm "How do I fix Wi-Fi dead zones?"
```

The index is written to `raglite-index.json` in the current directory;
re-run `index` after editing your notes. If `raglite` is linked onto your
PATH (`npm link`), the `raglite` command works directly.

## How it works

1. **Chunk** — each document is split at heading and paragraph boundaries
   into passages of at most ~800 characters, with a little overlap so
   context is not lost at the seams. Each passage remembers its file,
   heading, and starting line.
2. **Embed** — every passage is converted to a 384-dimension vector by
   all-MiniLM-L6-v2, running on CPU through Transformers.js.
3. **Retrieve** — the question is embedded the same way, and passages are
   ranked by cosine similarity. The top five are your answer, with
   citations.
4. **Generate (optional)** — with `--llm`, the retrieved passages are put
   into a grounded prompt ("answer using only these passages") for a local
   Ollama model, and the answer is printed above its sources.

The whole implementation is a few small files under `src/` — `chunk.js`,
`embed.js`, `index-store.js`, `retrieve.js`, `ollama.js`, `cli.js` — and
is meant to be read.

## Limitations

- Small and local by design: a JSON index and brute-force similarity
  search are fine for a notes folder, not for a million documents.
- Extractive by default: without Ollama you get the best passages, not a
  composed answer.
- Retrieval quality is bounded by the embedding model; all-MiniLM-L6-v2
  is fast and good for its size, but it is a small model.
- English-focused, like the embedding model itself.

## Tests

```sh
npm test
```

The suite (Node's built-in test runner) covers chunking, cosine-similarity
ranking, and an end-to-end index/ask cycle with a stub embedder — tests
never download the model.

## License

MIT — see [LICENSE](LICENSE).

---

*Built for Hacktoberfest 2026.*

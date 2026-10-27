// Optional generation via a locally running Ollama server.
//
// raglite is extractive by default. Only when the user passes --llm AND a
// local Ollama server answers do we send the retrieved passages to an
// open-weight chat model (default llama3.2, override with RAGLITE_MODEL).
// If Ollama is unreachable we report that and fall back to passages.

const DEFAULT_BASE = 'http://localhost:11434';

function baseUrl() {
  return (process.env.OLLAMA_HOST || DEFAULT_BASE).replace(/\/$/, '');
}

export function ollamaModel() {
  return process.env.RAGLITE_MODEL || 'llama3.2';
}

// True only if a server answers /api/tags within the timeout.
export async function ollamaAvailable(fetchImpl = fetch, timeoutMs = 1500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${baseUrl()}/api/tags`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Send a grounded prompt to the chat model and return its answer text.
export async function ollamaGenerate(prompt, fetchImpl = fetch) {
  const res = await fetchImpl(`${baseUrl()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel(),
      prompt,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama returned HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.response.trim();
}

// Build a prompt that restricts the model to the retrieved passages.
export function groundedPrompt(question, results) {
  const passages = results
    .map((r, i) => `[${i + 1}] (${r.file})\n${r.text}`)
    .join('\n\n');
  return [
    'Answer the question using only the passages below.',
    'If the passages do not contain the answer, say so plainly.',
    'Cite passages inline like [1], [2] where you use them.',
    '',
    'Passages:',
    passages,
    '',
    `Question: ${question}`,
    '',
    'Answer:',
  ].join('\n');
}

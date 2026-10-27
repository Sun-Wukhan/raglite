// Split a document into passages along heading and paragraph boundaries.
//
// A chunk never crosses a heading boundary. Paragraphs are packed together
// until adding another would exceed maxChars; the last (small) paragraph of
// a full chunk is repeated at the start of the next chunk as overlap context.
// A single paragraph longer than maxChars is hard-split with character
// overlap. Each chunk records its heading and 1-based start line so answers
// can cite where a passage came from.

const HEADING_RE = /^#{1,6}\s+\S/;

export function chunkDocument(text, { maxChars = 800, overlapChars = 120 } = {}) {
  const lines = text.split('\n');
  const sections = splitSections(lines);
  const chunks = [];

  for (const section of sections) {
    const paragraphs = splitParagraphs(section);
    let current = null; // { texts: [], startLine }

    const flush = () => {
      if (!current) return;
      chunks.push({
        text: current.texts.join('\n\n'),
        heading: section.heading,
        startLine: current.startLine,
      });
      current = null;
    };

    for (const para of paragraphs) {
      if (para.text.length > maxChars) {
        flush();
        chunks.push(...hardSplit(para, section.heading, maxChars, overlapChars));
        continue;
      }
      if (current && current.texts.join('\n\n').length + para.text.length + 2 > maxChars) {
        const lastPara = current.texts[current.texts.length - 1];
        const lastLine = current.lastLine;
        flush();
        // Carry the previous chunk's last paragraph forward as overlap,
        // but only when it is small enough to act as context, not bulk.
        if (lastPara.length <= overlapChars * 2) {
          current = { texts: [lastPara], startLine: lastLine };
        }
      }
      if (!current) current = { texts: [], startLine: para.startLine };
      current.texts.push(para.text);
      current.lastLine = para.startLine;
    }
    flush();
  }

  return chunks;
}

// Group lines into sections, each starting at a markdown heading
// (content before the first heading forms a heading-less section).
function splitSections(lines) {
  const sections = [];
  let current = { heading: null, lines: [], startOffset: 0 };
  lines.forEach((line, i) => {
    if (HEADING_RE.test(line)) {
      sections.push(current);
      current = { heading: line.replace(/^#+\s*/, '').trim(), lines: [], startOffset: i };
    } else {
      current.lines.push(line);
    }
  });
  sections.push(current);
  return sections
    .filter((s) => s.lines.some((l) => l.trim().length > 0))
    .map((s) => ({ ...s, firstLine: s.startOffset + (s.heading ? 2 : 1) }));
}

// Split section lines into paragraphs (blank-line separated), tracking the
// 1-based line number where each paragraph starts.
function splitParagraphs(section) {
  const paragraphs = [];
  let buf = [];
  let bufStart = 0;
  const push = () => {
    if (buf.length) {
      paragraphs.push({ text: buf.join('\n').trim(), startLine: bufStart });
      buf = [];
    }
  };
  section.lines.forEach((line, i) => {
    const lineNo = section.firstLine + i;
    if (line.trim() === '') {
      push();
    } else {
      if (!buf.length) bufStart = lineNo;
      buf.push(line);
    }
  });
  push();
  return paragraphs.filter((p) => p.text.length > 0);
}

// Split one oversized paragraph into maxChars pieces, each starting
// overlapChars before the previous piece ended.
function hardSplit(para, heading, maxChars, overlapChars) {
  const pieces = [];
  const step = Math.max(1, maxChars - overlapChars);
  let offset = 0;
  let consumedLines = 0;
  while (offset < para.text.length) {
    const piece = para.text.slice(offset, offset + maxChars);
    pieces.push({
      text: piece,
      heading,
      startLine: para.startLine + consumedLines,
    });
    consumedLines += (piece.match(/\n/g) || []).length;
    offset += step;
  }
  return pieces;
}

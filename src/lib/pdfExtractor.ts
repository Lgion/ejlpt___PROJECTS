import zlib from 'node:zlib';

if (typeof window !== 'undefined') {
  throw new Error('pdfExtractor must run on the server');
}

export function containsJapaneseCharacters(text: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

function unescapePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function decodePdfLiteralBytes(raw: string): string {
  // Check UTF-16BE BOM (\xFE\xFF) when embedded in literal strings
  if (raw.charCodeAt(0) === 0xfe && raw.charCodeAt(1) === 0xff) {
    let out = '';
    for (let i = 2; i + 1 < raw.length; i += 2) {
      const code = ((raw.charCodeAt(i) & 0xff) << 8) | (raw.charCodeAt(i + 1) & 0xff);
      out += String.fromCharCode(code);
    }
    return out;
  }
  const utf8Decoded = Buffer.from(raw, 'latin1').toString('utf8');
  return unescapePdfString(utf8Decoded.includes('\uFFFD') ? raw : utf8Decoded);
}

function extractTextOperatorsFromChunk(chunk: string): string[] {
  const results: string[] = [];

  // Match literal strings before Tj / TJ / '
  const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|')/g;
  let m: RegExpExecArray | null;
  while ((m = literalRegex.exec(chunk)) !== null) {
    const val = decodePdfLiteralBytes(m[1]).trim();
    if (val) results.push(val);
  }

  // Match TJ arrays [(...) -20 (...)] TJ
  const arrayRegex = /\[([^\]]+)\]\s*TJ/g;
  let arrMatch: RegExpExecArray | null;
  while ((arrMatch = arrayRegex.exec(chunk)) !== null) {
    const inner = arrMatch[1];
    const parts: string[] = [];
    const innerLit = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
    let litMatch: RegExpExecArray | null;
    while ((litMatch = innerLit.exec(inner)) !== null) {
      parts.push(decodePdfLiteralBytes(litMatch[1]));
    }
    const joined = parts.join('').trim();
    if (joined) results.push(joined);
  }

  return results;
}

export function extractBasicPdfText(buffer: Buffer): string {
  if (!buffer || buffer.length === 0) return '';

  const chunks: string[] = [];
  const latin1 = buffer.toString('latin1');
  chunks.push(...extractTextOperatorsFromChunk(latin1));

  // Scan FlateDecode compressed PDF streams
  let searchPos = 0;
  while (searchPos < buffer.length) {
    const streamIdx = buffer.indexOf('stream', searchPos, 'latin1');
    if (streamIdx < 0) break;

    let dataStart = streamIdx + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buffer[dataStart] === 0x0a) dataStart += 1;

    const endStreamIdx = buffer.indexOf('endstream', dataStart, 'latin1');
    if (endStreamIdx < 0) break;

    const rawSlice = buffer.subarray(dataStart, endStreamIdx);
    try {
      const inflated = zlib.inflateSync(rawSlice).toString('utf8');
      chunks.push(...extractTextOperatorsFromChunk(inflated));
    } catch {
      // Not a standard zlib Flate stream or non-text binary stream
    }

    searchPos = endStreamIdx + 9;
  }

  return chunks
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

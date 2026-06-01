// Compressão de transcrição pt-BR para reduzir tokens enviados ao avaliador.
// Remove fillers, marcadores de silêncio, repetições próximas e colapsa
// turnos consecutivos do mesmo speaker. Função pura — sem side effects.
//
// Uso:
//   import { compressTranscript } from "../_shared/transcript-compress.ts";
//   const { compressed, originalChars, compressedChars, ratio } = compressTranscript(raw);

const FILLERS_PT_BR = [
  "né", "tá", "tipo", "assim", "então", "tipo assim",
  "hum", "humm", "ahn", "ah", "eh", "uhm",
  "tipo, né", "sabe", "sabe?", "entendeu", "entendeu?",
];

// Remove silence markers and pauses
const SILENCE_PATTERNS = [
  /\[silence\]/gi,
  /\[pause\]/gi,
  /\[\.\.\.\]/g,
  /\(silêncio\)/gi,
  /\(pausa\)/gi,
];

// Build a single regex for fillers as standalone words/short clauses
const FILLER_REGEX = new RegExp(
  "\\b(" + FILLERS_PT_BR.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b[\\s,.]*",
  "gi"
);

// Collapse 3+ consecutive identical short tokens (e.g. "ééé", "isso isso isso")
const REPETITION_REGEX = /\b(\w{1,6})(\s+\1){2,}\b/gi;

export interface CompressionResult {
  compressed: string;
  originalChars: number;
  compressedChars: number;
  /** Ratio compressed/original (0..1). Lower = more compression. */
  ratio: number;
}

/**
 * Compresses a Portuguese-BR interview transcript.
 * Preserves speaker labels (Entrevistador:/Candidato:) and overall structure.
 */
export function compressTranscript(raw: string | null | undefined): CompressionResult {
  const original = (raw || "").trim();
  if (!original) {
    return { compressed: "", originalChars: 0, compressedChars: 0, ratio: 1 };
  }

  let text = original;

  // 1. Remove silence markers
  for (const pattern of SILENCE_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  // 2. Remove fillers
  text = text.replace(FILLER_REGEX, " ");

  // 3. Collapse repetitions
  text = text.replace(REPETITION_REGEX, "$1");

  // 4. Normalize whitespace per line, then collapse same-speaker consecutive turns
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const merged: string[] = [];
  let lastSpeaker: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (lastSpeaker && buffer.length > 0) {
      const content = buffer.join(" ").replace(/\s{2,}/g, " ").trim();
      if (content) merged.push(`${lastSpeaker}: ${content}`);
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(/^(Entrevistador(?:a)?|Candidato|AI|Assistant|User):\s*(.*)$/i);
    if (m) {
      const speaker = m[1];
      const content = m[2].trim();
      if (speaker !== lastSpeaker) {
        flush();
        lastSpeaker = speaker;
      }
      if (content) buffer.push(content);
    } else {
      // No speaker prefix — append to current buffer
      buffer.push(line);
    }
  }
  flush();

  // 5. Final whitespace cleanup
  let compressed = merged.join("\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  // Safety: never return empty if input had content
  if (!compressed && original) compressed = original;

  const ratio = original.length > 0 ? compressed.length / original.length : 1;
  return {
    compressed,
    originalChars: original.length,
    compressedChars: compressed.length,
    ratio: Math.round(ratio * 1000) / 1000,
  };
}

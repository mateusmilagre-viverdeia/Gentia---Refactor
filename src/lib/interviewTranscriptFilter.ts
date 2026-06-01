// Heuristics to drop hallucinated/noise transcriptions coming from the
// Realtime transcriber. Used by both public and logged-in culture interview
// components. Returns a "drop reason" or null if the transcript should be kept.

export type DropReason =
  | "cooldown"
  | "language"
  | "noise"
  | null;

const CONFIRMATION_WORDS = new Set([
  "sim", "claro", "ok", "okay", "uhum", "aham", "isso", "certo",
  "pode", "vamos", "manda", "bora", "show",
]);

const CONFIRMATION_PHRASES = [
  "pode ir", "pode começar", "pode comecar", "vamos lá", "vamos la",
  "tudo certo", "tudo bem", "estou pronto", "estou pronta",
  "to pronto", "to pronta", "tô pronto", "tô pronta",
  "pode seguir", "podemos começar", "podemos comecar",
];

function isConfirmation(text: string): boolean {
  const low = text.toLowerCase().trim().replace(/[.!?,;]+$/g, "");
  if (CONFIRMATION_WORDS.has(low)) return true;
  return CONFIRMATION_PHRASES.some((p) => low === p || low.startsWith(p));
}

// Detect non-Latin scripts (CJK, Cyrillic, Arabic, Hangul, Hiragana/Katakana).
function hasHighNonLatinRatio(text: string): boolean {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length === 0) return false;
  let nonLatin = 0;
  for (const ch of letters) {
    const code = ch.codePointAt(0) ?? 0;
    // Basic Latin + Latin-1 supplement + Latin extended A/B + IPA + Latin extended additional
    const isLatin =
      (code >= 0x0041 && code <= 0x007a) ||
      (code >= 0x00c0 && code <= 0x024f) ||
      (code >= 0x1e00 && code <= 0x1eff);
    if (!isLatin) nonLatin++;
  }
  return nonLatin / letters.length > 0.3;
}

// Very small dictionary of common single/short noise words the Realtime
// transcriber emits when it hallucinates from background noise / AI tail.
const NOISE_SHORT_WORDS = new Set([
  "again", "thank", "thanks", "you", "the", "this", "italiani", "italiano",
  "yeah", "bye", "hello", "hi", "ah", "uh", "um", "ok.", "okay.",
  "disseram", "merci", "gracias", "hola", "ciao",
]);

export function classifyTranscript(
  text: string,
  opts: { awaitingConfirmation?: boolean } = {},
): DropReason {
  const trimmed = text.trim();
  if (!trimmed) return "noise";

  if (hasHighNonLatinRatio(trimmed)) return "language";

  const words = trimmed.split(/\s+/).filter(Boolean);

  // Short utterance: only keep if it's a real confirmation (intro phase)
  // or contains a digit (idade, ano de nascimento, etc).
  if (words.length <= 3) {
    if (opts.awaitingConfirmation && isConfirmation(trimmed)) return null;
    if (isConfirmation(trimmed)) return null;
    if (/\d/.test(trimmed)) return null;

    // Compare normalized lowercase first/only word against noise dictionary.
    const first = words[0].toLowerCase().replace(/[.!?,;]+$/g, "");
    if (NOISE_SHORT_WORDS.has(first)) return "noise";

    // Single-word "this", "the", etc. handled above. For 2–3 words check
    // if every word is in the noise set.
    if (words.every((w) => NOISE_SHORT_WORDS.has(w.toLowerCase().replace(/[.!?,;]+$/g, "")))) {
      return "noise";
    }
  }

  return null;
}

import { parseContentBlocks } from '@/lib/parseContentBlocks';

// Common emoji pattern for detecting emoji-prefixed lines
const EMOJI_REGEX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

/**
 * Extrai os benefícios do bloco "O Que Você Encontra Aqui" 
 * da página "Vendendo a Empresa".
 * 
 * Suporta três formatos de linha:
 * 1. Bullet markdown: "- texto" ou "* texto"
 * 2. Emoji direto: "👋 **Título:** descrição" (formato EP Partners)
 * 3. Misto: "* 👋 **Título:** descrição" (formato Grupo Capilar)
 */
export function extractBenefits(sellingContent: string): string[] {
  if (!sellingContent || sellingContent.trim().length === 0) {
    return [];
  }

  // Strategy 1: Use parseContentBlocks
  const blocks = parseContentBlocks(sellingContent);
  const benefitsBlock = blocks.find(b => b.id === 'o-que-encontra');

  let blockContent = benefitsBlock?.content ?? '';

  // Strategy 2: Manual fallback — find 🎁 section directly
  if (!blockContent) {
    const giftIndex = sellingContent.indexOf('🎁');
    if (giftIndex === -1) return [];

    // Find end: next major section emoji (🎯) or end of content
    const afterGift = sellingContent.substring(giftIndex);
    const nextSectionMatch = afterGift.match(/\n(?:#{1,3}\s+(?:\d+\.\s*)?|\d+\.\s+)🎯/);
    blockContent = nextSectionMatch
      ? afterGift.substring(0, nextSectionMatch.index!)
      : afterGift;
  }

  return extractLinesFromBlock(blockContent);
}

function extractLinesFromBlock(blockContent: string): string[] {
  const benefits: string[] = [];
  const lines = blockContent.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 6) continue;

    // Skip header lines (## or plain title with 🎁)
    if (/^#{1,3}\s/.test(line)) continue;
    if (line.startsWith('🎁')) continue;
    // Skip intro paragraphs (lines without emoji or bullet prefix)
    
    let text: string | null = null;

    // Format 1: "- text" or "* text"  
    const bulletMatch = line.match(/^[\-\*]\s+(.+)$/);
    if (bulletMatch) {
      text = bulletMatch[1];
      // If bullet content starts with emoji, keep it
    }

    // Format 2: Line starts with emoji (not 🎁)
    if (!text && EMOJI_REGEX.test(line)) {
      text = line;
    }

    if (!text) continue;

    // Clean up
    text = text
      .replace(/\*\*/g, '')     // Remove bold markers
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();

    if (text.length > 5) {
      benefits.push(text);
    }
  }

  return benefits;
}

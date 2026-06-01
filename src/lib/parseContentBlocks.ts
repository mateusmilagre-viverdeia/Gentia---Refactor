export interface ContentBlock {
  id: string;
  title: string;
  content: string;
  emoji: string;
  number: number;
  hidden?: boolean;
}

const BLOCK_CONFIG = [
  { id: 'abertura', emoji: '✨', defaultTitle: 'Abertura Inicial' },
  { id: 'quem-somos', emoji: '🌟', defaultTitle: 'Quem Somos — A Nossa História' },
  { id: 'onde-estamos', emoji: '🚀', defaultTitle: 'Onde Estamos — O Momento Atual' },
  { id: 'o-que-e-trabalhar', emoji: '🎬', defaultTitle: 'O Que É Trabalhar Aqui' },
  { id: 'santo-vai-bater', emoji: '🤝', defaultTitle: 'Nosso Santo Vai Bater Se…' },
  { id: 'lado-dificil', emoji: '⚠️', defaultTitle: 'O Lado Difícil' },
  { id: 'o-que-encontra', emoji: '🎁', defaultTitle: 'O Que Você Encontra Aqui' },
  { id: 'cta', emoji: '🎯', defaultTitle: 'E Aí… Está Pronto, topa o desafio?' },
];

// Map emoji to block config
const EMOJI_TO_CONFIG: Record<string, { id: string; emoji: string; defaultTitle: string }> = {
  '✨': { id: 'abertura', emoji: '✨', defaultTitle: 'Abertura Inicial' },
  '🌟': { id: 'quem-somos', emoji: '🌟', defaultTitle: 'Quem Somos — A Nossa História' },
  '🚀': { id: 'onde-estamos', emoji: '🚀', defaultTitle: 'Onde Estamos — O Momento Atual' },
  '🎬': { id: 'o-que-e-trabalhar', emoji: '🎬', defaultTitle: 'O Que É Trabalhar Aqui' },
  '🤝': { id: 'santo-vai-bater', emoji: '🤝', defaultTitle: 'Nosso Santo Vai Bater Se…' },
  '⚠️': { id: 'lado-dificil', emoji: '⚠️', defaultTitle: 'O Lado Difícil' },
  '🎁': { id: 'o-que-encontra', emoji: '🎁', defaultTitle: 'O Que Você Encontra Aqui' },
  '🎯': { id: 'cta', emoji: '🎯', defaultTitle: 'E Aí… Está Pronto, topa o desafio?' },
};

const BLOCK_MARKER_REGEX = /<!--\s*block:([a-z0-9-]+)\s*-->/i;

/**
 * Build a serialized markdown block including a stable identity marker.
 * The marker lets the parser preserve block identity even when the user
 * removes the emoji or rewrites the title.
 */
export function serializeBlock(
  blockId: string,
  emoji: string,
  number: number,
  title: string,
  content: string
): string {
  const emojiPrefix = emoji.trim() ? `${emoji.trim()} ` : '';
  const headerLine = `## ${emojiPrefix}${number}. ${title}`.trim();
  const body = content.trim();
  return `<!-- block:${blockId} -->\n${headerLine}${body ? `\n\n${body}` : ''}`;
}

/**
 * Extract emoji + title from a header line like:
 *   "## ✨ 1. My Title"  -> { emoji: "✨", title: "My Title" }
 *   "## 1. My Title"     -> { emoji: "",  title: "My Title" }
 *   "## My Title"        -> { emoji: "",  title: "My Title" }
 */
function parseHeaderLine(line: string): { emoji: string; title: string } {
  const stripped = line.replace(/^#{1,3}\s+/, '').trim();
  // Try to peel a leading emoji (extended pictographic)
  const emojiMatch = stripped.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?)\s*(.*)$/u);
  let emoji = '';
  let rest = stripped;
  if (emojiMatch) {
    emoji = emojiMatch[1];
    rest = emojiMatch[2];
  }
  // Strip leading numbering like "1." / "12. "
  rest = rest.replace(/^\d+\.\s*/, '').trim();
  return { emoji, title: rest };
}

export function parseContentBlocks(fullContent: string): ContentBlock[] {
  if (!fullContent) return [];

  // ----- Marker-based parsing (preferred) -----
  if (BLOCK_MARKER_REGEX.test(fullContent)) {
    const result: ContentBlock[] = [];
    const parts = fullContent.split(/(?=<!--\s*block:[a-z0-9-]+\s*-->)/i);

    parts.forEach((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return;
      const markerMatch = trimmed.match(BLOCK_MARKER_REGEX);
      if (!markerMatch) return;
      const id = markerMatch[1];

      // Find first non-empty line after the marker for the header
      const afterMarker = trimmed.replace(BLOCK_MARKER_REGEX, '').trimStart();
      const lines = afterMarker.split('\n');
      const headerLine = lines[0] || '';
      const { emoji, title } = parseHeaderLine(headerLine);

      const fallback = BLOCK_CONFIG.find((b) => b.id === id);
      const finalTitle = title || fallback?.defaultTitle || id;

      result.push({
        id,
        title: emoji ? `${emoji} ${finalTitle}` : finalTitle,
        content: trimmed,
        emoji,
        number: result.length + 1,
      });
    });

    return result;
  }

  // ----- Legacy emoji-based parsing (backward compatibility) -----
  const result: ContentBlock[] = [];

  // All emojis we look for
  const emojiList = ['✨', '🌟', '🚀', '🎬', '🤝', '⚠️', '🎁', '🎯'];

  // Find first header with any of our emojis (with or without ## prefix and numbering)
  const emojiGroup = emojiList.join('|');
  const firstHeaderRegex = new RegExp(`(?:^|\\n)(?:#{1,3}\\s+(?:\\d+\\.\\s*)?|\\d+\\.\\s+)(?:${emojiGroup})`, 'm');
  const firstHeaderMatch = fullContent.match(firstHeaderRegex);
  const firstHeaderIndex = firstHeaderMatch ? fullContent.indexOf(firstHeaderMatch[0]) : -1;

  // Content before first header = Abertura Inicial
  if (firstHeaderIndex > 0) {
    const openingContent = fullContent.substring(0, firstHeaderIndex).trim();
    if (openingContent.length > 50) {
      result.push({
        id: 'abertura',
        title: '✨ Abertura Inicial',
        content: openingContent,
        emoji: '✨',
        number: 1,
      });
    }
  }

  // Split by headers containing any emoji
  const blockPattern = new RegExp(`(?=(?:^|\\n)(?:#{1,3}\\s+(?:\\d+\\.\\s*)?|\\d+\\.\\s+)(?:${emojiGroup}))`, 'gm');
  const rawBlocks = fullContent.split(blockPattern).filter((s) => s.trim());

  rawBlocks.forEach((blockContent) => {
    const trimmed = blockContent.trim();
    const firstLine = trimmed.split('\n')[0];
    const headerLine = firstLine.replace(/^#{1,3}\s+/, '').trim();

    let foundEmoji: string | null = null;
    for (const emoji of emojiList) {
      if (headerLine.includes(emoji)) {
        foundEmoji = emoji;
        break;
      }
    }

    if (!foundEmoji) return;

    const config = EMOJI_TO_CONFIG[foundEmoji];
    if (!config) return;

    if (config.id === 'abertura' && result.some((b) => b.id === 'abertura')) return;

    let title = headerLine.trim();
    title = title.replace(/(\d+\.\s*)/, '');

    result.push({
      id: config.id,
      title,
      content: trimmed,
      emoji: config.emoji,
      number: result.length + 1,
    });
  });

  return result;
}

export function mergeBlocks(blocks: ContentBlock[]): string {
  return blocks.map((b) => b.content).join('\n\n');
}

export function getBlockQuickActions(blockId: string): { label: string; prompt: string }[] {
  const actions: Record<string, { label: string; prompt: string }[]> = {
    'abertura': [
      { label: 'Mais provocativo', prompt: 'Aumente a provocação inicial para afastar quem não combina' },
      { label: 'Mais acolhedor', prompt: 'Suavize o tom mantendo autenticidade' },
      { label: 'Mais curto', prompt: 'Reduza mantendo o impacto inicial' },
    ],
    'quem-somos': [
      { label: 'Mais emocional', prompt: 'Adicione mais emoção e storytelling' },
      { label: 'Mais curto', prompt: 'Reduza mantendo a essência' },
      { label: 'Mais provocativo', prompt: 'Comece com uma provocação mais forte' },
    ],
    'onde-estamos': [
      { label: 'Destacar números', prompt: 'Destaque mais os números e conquistas' },
      { label: 'Mais humilde', prompt: 'Reduza a autopromoção, seja mais autêntico' },
      { label: 'Adicionar marco', prompt: 'Adicione um marco importante recente' },
    ],
    'o-que-e-trabalhar': [
      { label: 'Mais vivido', prompt: 'Descreva o dia-a-dia de forma mais vivida' },
      { label: 'Adicionar ritual', prompt: 'Mencione um ritual ou prática específica' },
      { label: 'Mais informal', prompt: 'Deixe mais descontraído e informal' },
    ],
    'santo-vai-bater': [
      { label: 'Adicionar perfil', prompt: 'Adicione mais um perfil ideal' },
      { label: 'Mais pessoal', prompt: 'Reformule de forma mais pessoal e direta' },
      { label: 'Remover item', prompt: 'Reduza para os 5 principais' },
    ],
    'lado-dificil': [
      { label: 'Mais direto', prompt: 'Seja ainda mais direto sobre os desafios' },
      { label: 'Mais suave', prompt: 'Suavize um pouco o tom sem perder autenticidade' },
      { label: 'Adicionar desafio', prompt: 'Adicione outro comportamento que não toleramos' },
    ],
    'o-que-encontra': [
      { label: 'Destacar crescimento', prompt: 'Destaque mais oportunidades de crescimento' },
      { label: 'Adicionar benefício', prompt: 'Adicione um benefício ou vantagem' },
      { label: 'Mais tangível', prompt: 'Seja mais específico e tangível' },
    ],
    'cta': [
      { label: 'Mais urgente', prompt: 'Aumente a urgência do chamado' },
      { label: 'Mais acolhedor', prompt: 'Deixe mais acolhedor e menos urgente' },
      { label: 'Simplificar', prompt: 'Simplifique a chamada para ação' },
    ],
  };

  return actions[blockId] || [
    { label: 'Melhorar', prompt: 'Melhore este bloco' },
    { label: 'Mais curto', prompt: 'Reduza o tamanho' },
  ];
}

import { VisionAnalysis, VersionHistoryItem } from "@/types/vision.types";

const STOPWORDS = [
  "a", "o", "e", "de", "da", "do", "em", "para", "com", "por", "uma", "um",
  "os", "as", "dos", "das", "ao", "à", "no", "na", "nos", "nas", "pelo", "pela",
  "que", "como", "mais", "seu", "sua", "seus", "suas", "você", "sua", "esse",
  "essa", "isso", "este", "esta", "isto", "são", "foi", "ser", "está", "ter",
  "tem", "muito", "muita", "pode", "qual", "quando", "onde", "quem", "porque"
];

function extractKeywords(answers: Record<number, string>): string[] {
  const allText = Object.values(answers).join(" ").toLowerCase();
  const words = allText.match(/\b[a-záàâãéèêíïóôõöúçñ]{4,}\b/gi) || [];
  
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    const normalized = word.toLowerCase();
    if (!STOPWORDS.includes(normalized)) {
      wordCount[normalized] = (wordCount[normalized] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
}

function generateInsights(answers: Record<number, string>, keywords: string[]): string[] {
  const insights: string[] = [];
  
  if (answers[1]) {
    insights.push(`Seu segmento de atuação é ${answers[1]}.`);
  }
  
  if (answers[4]) {
    insights.push(`Seu público-alvo principal são ${answers[4]}.`);
  }
  
  if (keywords.length > 0) {
    insights.push(`Os conceitos mais importantes para sua visão são: ${keywords.slice(0, 3).join(", ")}.`);
  }
  
  if (answers[6]) {
    insights.push(`Seus esforços serão direcionados para ${answers[6]}.`);
  }
  
  if (answers[7]) {
    insights.push(`O sucesso será medido através de ${answers[7]}.`);
  }
  
  if (answers[9]) {
    insights.push(`A imagem mental de sucesso que você tem é: ${answers[9]}.`);
  }
  
  return insights;
}

export function generateVisionAnalysis(
  sessionId: string,
  answers: Record<number, string>
): VisionAnalysis {
  const keywords = extractKeywords(answers);
  const insights = generateInsights(answers, keywords);
  
  // Gerar visão inspiracional baseada nas perguntas 5, 8, 9
  const future = answers[5] || "referência no mercado";
  const forbes = answers[8] || "transformar o setor";
  const image = answers[9] || "uma organização de impacto";
  
  const visionInspirational = `Ser reconhecida como ${image}, alcançando ${future}, onde nossa história inspire outros a ${forbes}.`;
  
  // Gerar visão mensurável baseada na pergunta 7
  const metrics = answers[7] || "crescimento sustentável e impacto positivo";
  const segment = answers[1] || "nosso mercado";
  
  const visionMeasurable = `Em 3-5 anos, ${metrics}, consolidando nossa presença em ${segment} e estabelecendo-nos como referência no setor.`;
  
  return {
    id: crypto.randomUUID(),
    sessionId,
    visionInspirational,
    visionMeasurable,
    keywords,
    insights,
    createdAt: new Date().toISOString(),
  };
}

export function generateShorterVersion(
  original: VisionAnalysis
): Pick<VersionHistoryItem, "visionInspirational" | "visionMeasurable"> {
  // Reduzir em ~30% mantendo essência
  const inspirationalWords = original.visionInspirational.split(" ");
  const measurableWords = original.visionMeasurable.split(" ");
  
  const shorterInspirational = inspirationalWords
    .slice(0, Math.ceil(inspirationalWords.length * 0.7))
    .join(" ") + ".";
  
  const shorterMeasurable = measurableWords
    .slice(0, Math.ceil(measurableWords.length * 0.7))
    .join(" ") + ".";
  
  return {
    visionInspirational: shorterInspirational,
    visionMeasurable: shorterMeasurable,
  };
}

export function generateAlternativeVersions(
  original: VisionAnalysis
): Array<Pick<VersionHistoryItem, "visionInspirational" | "visionMeasurable">> {
  const alternatives = [
    {
      visionInspirational: original.visionInspirational.replace(
        "Ser reconhecida como",
        "Tornar-se"
      ),
      visionMeasurable: original.visionMeasurable.replace(
        "Em 3-5 anos",
        "Nos próximos anos"
      ),
    },
    {
      visionInspirational: `Aspiramos ${original.visionInspirational
        .replace("Ser reconhecida como", "")
        .toLowerCase()}`,
      visionMeasurable: `Nossa meta é ${original.visionMeasurable
        .replace("Em 3-5 anos, ", "")
        .toLowerCase()}`,
    },
  ];
  
  return alternatives;
}

export function generateShortTermVersion(
  original: VisionAnalysis
): Pick<VersionHistoryItem, "visionInspirational" | "visionMeasurable"> {
  return {
    visionInspirational: original.visionInspirational,
    visionMeasurable: original.visionMeasurable.replace(
      "3-5 anos",
      "1-2 anos"
    ),
  };
}

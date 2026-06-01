import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, TrendingUp, Heart, Compass, Target, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KeywordSuggestionsProps {
  answers: Record<number, string>;
  pillarType: 'mission' | 'vision';
  onSelectKeyword: (keyword: string) => void;
  currentAnswer: string;
}

interface Keywords {
  frequent: string[];
  impactful: string[];
  direction?: string[];
  niche?: string[];
  positioning?: string[];
}

export function KeywordSuggestions({ 
  answers, 
  pillarType, 
  onSelectKeyword,
  currentAnswer 
}: KeywordSuggestionsProps) {
  const [keywords, setKeywords] = useState<Keywords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-keywords', {
        body: { answers, pillarType }
      });

      if (fnError) {
        throw fnError;
      }

      if (data.error && !data.frequent) {
        throw new Error(data.error);
      }

      setKeywords({
        frequent: data.frequent || [],
        impactful: data.impactful || [],
        direction: data.direction || [],
        niche: data.niche || [],
        positioning: data.positioning || [],
      });
    } catch (err) {
      console.error("Error fetching keywords:", err);
      setError("Não foi possível gerar sugestões");
      toast.error("Erro ao gerar sugestões de palavras-chave");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have enough answers
    const answeredCount = Object.values(answers).filter(a => a?.trim()).length;
    const minAnswers = pillarType === 'mission' ? 5 : 7;
    
    if (answeredCount >= minAnswers) {
      fetchKeywords();
    } else {
      setIsLoading(false);
      setError("Responda mais perguntas para receber sugestões");
    }
  }, []);

  const isKeywordSelected = (keyword: string) => {
    const normalizedAnswer = currentAnswer.toLowerCase();
    const normalizedKeyword = keyword.toLowerCase();
    return normalizedAnswer.includes(normalizedKeyword);
  };

  const handleKeywordClick = (keyword: string) => {
    if (!isKeywordSelected(keyword)) {
      onSelectKeyword(keyword);
    }
  };

  const renderKeywordSection = (
    items: string[],
    icon: React.ReactNode,
    label: string,
    selectedClass: string,
    hoverClass: string,
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((keyword) => (
            <Button
              key={keyword}
              variant={isKeywordSelected(keyword) ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleKeywordClick(keyword)}
              disabled={isKeywordSelected(keyword)}
              className={`
                ${isKeywordSelected(keyword) ? selectedClass : hoverClass}
              `}
            >
              {keyword}
              {isKeywordSelected(keyword) && <span className="ml-1">✓</span>}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium">Analisando suas respostas...</span>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </div>
    );
  }

  if (error && !keywords) {
    return (
      <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchKeywords}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!keywords || (keywords.frequent.length === 0 && keywords.impactful.length === 0)) {
    return null;
  }

  return (
    <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Sugestões da IA</span>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchKeywords} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {renderKeywordSection(
        keywords.frequent,
        <TrendingUp className="h-4 w-4 text-blue-500" />,
        "Mais se repetem nas suas respostas:",
        "bg-blue-100 text-blue-700 border-blue-200 cursor-default",
        "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
      )}

      {renderKeywordSection(
        keywords.impactful,
        <Heart className="h-4 w-4 text-purple-500" />,
        "Forte impacto emocional e significado:",
        "bg-purple-100 text-purple-700 border-purple-200 cursor-default",
        "hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300",
      )}

      {renderKeywordSection(
        keywords.direction || [],
        <Compass className="h-4 w-4 text-green-500" />,
        "Direção e sonho de longo prazo:",
        "bg-green-100 text-green-700 border-green-200 cursor-default",
        "hover:bg-green-50 hover:text-green-700 hover:border-green-300",
      )}

      {renderKeywordSection(
        keywords.niche || [],
        <Target className="h-4 w-4 text-orange-500" />,
        "Nicho e subnicho de mercado:",
        "bg-orange-100 text-orange-700 border-orange-200 cursor-default",
        "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300",
      )}

      {renderKeywordSection(
        keywords.positioning || [],
        <Flag className="h-4 w-4 text-indigo-500" />,
        "Posicionamento estratégico:",
        "bg-indigo-100 text-indigo-700 border-indigo-200 cursor-default",
        "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300",
      )}

      <p className="text-xs text-muted-foreground">
        Clique nas palavras para adicioná-las à sua resposta
      </p>
    </div>
  );
}

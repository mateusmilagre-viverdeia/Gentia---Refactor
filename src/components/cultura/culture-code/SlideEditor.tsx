import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, ArrowUp, ArrowDown, Save, RefreshCw, Loader2 } from 'lucide-react';
import type { CultureCodeSlide } from '@/types/culture-code.types';

interface SlideEditorProps {
  slide: CultureCodeSlide;
  onUpdate: (updates: Partial<CultureCodeSlide>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRegenerate?: (instruction?: string) => Promise<void>;
  isRegenerating?: boolean;
}

export function SlideEditor({ 
  slide, 
  onUpdate, 
  onDelete, 
  onMove,
  onRegenerate,
  isRegenerating = false,
}: SlideEditorProps) {
  const [title, setTitle] = useState(slide.title);
  const [body, setBody] = useState(slide.body.join('\n'));
  const [mantra, setMantra] = useState(slide.valueData?.mantra || '');
  const [dos, setDos] = useState(slide.valueData?.dos?.join('\n') || '');
  const [donts, setDonts] = useState(slide.valueData?.donts?.join('\n') || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    setTitle(slide.title);
    setBody(slide.body.join('\n'));
    setMantra(slide.valueData?.mantra || '');
    setDos(slide.valueData?.dos?.join('\n') || '');
    setDonts(slide.valueData?.donts?.join('\n') || '');
    setHasChanges(false);
    setInstruction('');
  }, [slide.id]);

  const handleSave = () => {
    const updates: Partial<CultureCodeSlide> = {
      title,
      body: body.split('\n').filter(l => l.trim()),
    };

    if (slide.type === 'value') {
      updates.valueData = {
        mantra,
        dos: dos.split('\n').filter(l => l.trim()),
        donts: donts.split('\n').filter(l => l.trim()),
      };
    }

    onUpdate(updates);
    setHasChanges(false);
  };

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  const handleRegenerate = async () => {
    if (onRegenerate) {
      await onRegenerate(instruction || undefined);
      setInstruction('');
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">EDITOR DO SLIDE</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove('up')}>
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMove('down')}>
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Slide {slide.slideNumber}</span>
          <span>•</span>
          <span className="capitalize">{slide.sectionId}</span>
          {slide.isCustom && <span className="text-xs">✨ Customizado</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => { setTitle(e.target.value); markChanged(); }}
            placeholder="Título do slide"
            disabled={isRegenerating}
          />
        </div>

        {slide.type === 'value' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="mantra">Mantra</Label>
              <Input
                id="mantra"
                value={mantra}
                onChange={(e) => { setMantra(e.target.value); markChanged(); }}
                placeholder="Ex: Fazemos acontecer"
                disabled={isRegenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dos">Como Vivemos (um por linha)</Label>
              <Textarea
                id="dos"
                value={dos}
                onChange={(e) => { setDos(e.target.value); markChanged(); }}
                placeholder="Entregamos o que prometemos&#10;Medimos nosso sucesso"
                rows={4}
                disabled={isRegenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="donts">Como NÃO Vivemos (um por linha)</Label>
              <Textarea
                id="donts"
                value={donts}
                onChange={(e) => { setDonts(e.target.value); markChanged(); }}
                placeholder="Evitamos desculpas&#10;Não aceitamos mediocridade"
                rows={4}
                disabled={isRegenerating}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="body">Conteúdo (uma linha por frase)</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => { setBody(e.target.value); markChanged(); }}
              placeholder="Linha 1&#10;Linha 2&#10;Linha 3"
              rows={6}
              disabled={isRegenerating}
            />
            <p className="text-xs text-muted-foreground">
              Ideal: 2 linhas | Máximo: 3 linhas
            </p>
          </div>
        )}

        {/* AI Regeneration Section */}
        {onRegenerate && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <Label className="text-xs text-muted-foreground">
              💬 Instrução para IA (opcional)
            </Label>
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: mais curto, mais emocional, inclua X..."
              disabled={isRegenerating}
            />
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRegenerating ? 'Regenerando...' : 'Regenerar com IA'}
            </Button>
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isRegenerating}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {hasChanges ? 'Salvar Alterações' : 'Salvo'}
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Video, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PandaVideo {
  id: string;
  title: string;
  status: string;
  thumbnail?: string;
  video_player?: string;
  video_external_id?: string;
  created_at: string;
  length?: number;
}

interface PandaVideoPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'single' | 'batch';
  onSelect?: (video: { video_url: string; thumbnail: string; title: string }) => void;
  onBatchSelect?: (videos: { video_url: string; thumbnail: string; title: string }[]) => void;
}

export const PandaVideoPicker = ({ open, onOpenChange, mode = 'single', onSelect, onBatchSelect }: PandaVideoPickerProps) => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<PandaVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchVideos = async (searchQuery: string, pageNum: number, append = false) => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Você precisa estar logado', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({ page: String(pageNum) });
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/panda-video?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao buscar vídeos');
      }

      const data = await response.json();
      const videoList: PandaVideo[] = Array.isArray(data) ? data : (data.videos || []);
      
      if (append) {
        setVideos(prev => [...prev, ...videoList]);
      } else {
        setVideos(videoList);
      }
      setHasMore(videoList.length >= 20);
    } catch (err: any) {
      toast({ title: 'Erro ao buscar vídeos do Panda', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setPage(1);
      setSearchTerm('');
      setSearchInput('');
      setSelected(new Set());
      fetchVideos('', 1);
    }
  }, [open]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
    fetchVideos(searchInput, 1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(searchTerm, nextPage, true);
  };

  const buildVideoData = (video: PandaVideo) => {
    const videoUrl = video.video_player || `https://player-vz-${video.id}.tv.pandavideo.com.br/embed/?v=${video.id}`;
    return {
      video_url: videoUrl,
      thumbnail: video.thumbnail || '',
      title: video.title || '',
    };
  };

  const handleSingleSelect = (video: PandaVideo) => {
    onSelect?.(buildVideoData(video));
    onOpenChange(false);
  };

  const toggleSelection = (videoId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const handleBatchConfirm = () => {
    const selectedVideos = videos
      .filter(v => selected.has(v.id))
      .map(buildVideoData);
    onBatchSelect?.(selectedVideos);
    onOpenChange(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isBatch = mode === 'batch';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            {isBatch ? 'Importar Vídeos em Lote' : 'Importar do Panda Video'}
          </DialogTitle>
          <DialogDescription>
            {isBatch ? 'Selecione os vídeos que deseja importar como aulas.' : 'Selecione um vídeo da sua conta Panda Video para importar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vídeos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>Buscar</Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading && videos.length === 0 ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Carregando vídeos...</span>
            </div>
          ) : videos.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">Nenhum vídeo encontrado.</p>
          ) : (
            <>
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => isBatch ? toggleSelection(video.id) : handleSingleSelect(video)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    isBatch && selected.has(video.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  {isBatch && (
                    <Checkbox
                      checked={selected.has(video.id)}
                      onCheckedChange={() => toggleSelection(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0"
                    />
                  )}
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-24 h-14 rounded object-cover flex-shrink-0 bg-muted"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{video.title || 'Sem título'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {video.status && (
                        <span className={`px-1.5 py-0.5 rounded ${video.status === 'CONVERTED' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                          {video.status}
                        </span>
                      )}
                      {video.length && <span>{formatDuration(video.length)}</span>}
                    </div>
                  </div>
                  {!isBatch && <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
              ))}
              {hasMore && (
                <Button variant="outline" className="w-full" onClick={handleLoadMore} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Carregar mais
                </Button>
              )}
            </>
          )}
        </div>

        {isBatch && (
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-sm text-muted-foreground">{selected.size} vídeo(s) selecionado(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleBatchConfirm} disabled={selected.size === 0}>
                Importar {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

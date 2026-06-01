import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Download, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl?: string;
  duration?: number; // fallback em segundos
  currentTime?: number;
  onTimeChange?: (time: number) => void;
}

export function AudioPlayer({ audioUrl, duration: fallbackDuration = 0, currentTime = 0, onTimeChange }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(currentTime);
  // Initialize with fallbackDuration if provided - use it as initial value
  const [duration, setDuration] = useState(fallbackDuration > 0 ? fallbackDuration : 0);
  const [loadError, setLoadError] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(!!audioUrl);
  const [audioReady, setAudioReady] = useState(false);
  const [metadataTimeout, setMetadataTimeout] = useState(false);

  // Generate stable waveform bars based on duration
  const waveformBars = useCallback(() => {
    const seed = duration || 100;
    return Array.from({ length: 80 }, (_, i) => {
      const x = (i + seed) * 0.1;
      return 20 + Math.abs(Math.sin(x * 3) * 40 + Math.cos(x * 7) * 30);
    });
  }, [duration])();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Set a timeout to use fallback duration if metadata doesn't load quickly
  useEffect(() => {
    if (!audioUrl) return;
    
    const timeout = setTimeout(() => {
      if (duration === 0 && fallbackDuration > 0) {
        console.log('Metadata timeout - using fallback duration:', fallbackDuration);
        setDuration(fallbackDuration);
        setMetadataTimeout(true);
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeout);
  }, [audioUrl, fallbackDuration, duration]);

  // Audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded, duration:', audio.duration);
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setAudioReady(true);
      } else if (fallbackDuration > 0) {
        // Use fallback if audio duration is invalid
        setDuration(fallbackDuration);
      }
      setIsLoading(false);
    };
    
    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        console.log('Audio duration changed to:', audio.duration);
        setDuration(audio.duration);
        setAudioReady(true);
      }
    };
    
    const handleError = (e: Event) => {
      console.error('Audio load error:', e);
      setLoadError(true);
      setIsLoading(false);
      // On error, use fallback duration if available
      if (fallbackDuration > 0 && isFinite(fallbackDuration)) {
        setDuration(fallbackDuration);
      }
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
      onTimeChange?.(audio.currentTime);
      
      // Sometimes duration becomes available during playback
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0 && audio.duration !== duration) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setAudioReady(true);
      }
    };
    
    const handleCanPlayThrough = () => {
      setIsLoading(false);
      setAudioReady(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
    };
  }, [onTimeChange, fallbackDuration, duration]);

  // Sync playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleProgressChange = (value: number[]) => {
    const newTime = value[0];
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onTimeChange?.(newTime);
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(duration, progress + seconds));
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    onTimeChange?.(newTime);
  };

  const handleDownload = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'interview-audio.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Show placeholder if no audio URL
  if (!audioUrl) {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
        <div className="relative h-12 flex items-center gap-[2px]">
          {waveformBars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-full bg-muted-foreground/20"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <p className="text-sm text-muted-foreground">
            Áudio não disponível para esta entrevista
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            A gravação de áudio não estava habilitada quando esta entrevista foi realizada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Waveform Visualization */}
      <div 
        className="relative h-12 flex items-center gap-[2px] cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percent = clickX / rect.width;
          const newTime = percent * duration;
          handleProgressChange([newTime]);
        }}
      >
        {waveformBars.map((height, index) => {
          const barProgress = (index / waveformBars.length) * duration;
          const isPlayed = barProgress <= progress;
          return (
            <div
              key={index}
              className={cn(
                "flex-1 rounded-full transition-colors",
                isPlayed ? "bg-primary" : "bg-muted-foreground/30"
              )}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>

      {/* Progress Slider */}
      <Slider
        value={[progress]}
        max={duration || 1}
        step={0.1}
        onValueChange={handleProgressChange}
        className="cursor-pointer"
      />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleSkip(-10)}
            disabled={!audioUrl}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={togglePlay}
            disabled={!audioUrl || isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleSkip(10)}
            disabled={!audioUrl}
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Time Display - always show duration, use fallback if needed */}
          <span className="text-sm text-muted-foreground ml-2">
            {isFinite(progress) ? formatTime(progress) : '00:00'} / {duration > 0 ? formatTime(duration) : (isLoading ? 'Carregando...' : formatTime(fallbackDuration))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Volume */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          {/* Playback Speed */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                {playbackSpeed}x
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={cn(playbackSpeed === speed && "bg-accent")}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Download */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={!audioUrl}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Play, Square, Clock, X, ChevronUp, ChevronDown } from "lucide-react";
import { useTimerStore } from "@/stores/useTimerStore";
import { useConsultantTimeTracking } from "@/hooks/useConsultantTimeTracking";
import { 
  TIME_CATEGORY_LABELS, 
  TIME_CATEGORIES,
  formatDuration,
  type TimeEntryCategory 
} from "@/types/time-tracking.types";

import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface ActiveTimerWidgetProps {
  className?: string;
}

export function ActiveTimerWidget({ className }: ActiveTimerWidgetProps) {
  const { 
    isActive, 
    accountId, 
    accountName, 
    category, 
    startedAt, 
    description,
    stopTimer,
    updateCategory,
    updateDescription,
    getElapsedMinutes,
  } = useTimerStore();

  const { createEntry } = useConsultantTimeTracking();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Update elapsed time every second
  useEffect(() => {
    if (!isActive) return;

    const updateElapsed = () => {
      setElapsedMinutes(getElapsedMinutes());
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isActive, getElapsedMinutes]);

  const handleStop = async () => {
    if (!accountId) return;
    
    setIsSaving(true);
    try {
      const timerData = stopTimer();
      const minutes = Math.max(1, getElapsedMinutes());
      
      await createEntry({
        account_id: timerData.accountId!,
        entry_date: formatBRT(new Date(), "yyyy-MM-dd"),
        duration_minutes: minutes,
        category: timerData.category,
        description: timerData.description || null,
        billable: true,
      });
    } catch (error) {
      console.error("Error saving time entry:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          className
        )}
      >
        <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md overflow-hidden">
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-primary/10 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Clock className="h-5 w-5 text-primary" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="font-semibold text-lg">
                {formatDuration(elapsedMinutes)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {accountName}
              </Badge>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Categoria</label>
                    <Select
                      value={category}
                      onValueChange={(value) => updateCategory(value as TimeEntryCategory)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {TIME_CATEGORY_LABELS[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <Input
                      placeholder="O que você está fazendo?"
                      value={description}
                      onChange={(e) => updateDescription(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Started at */}
                  <p className="text-xs text-muted-foreground">
                    Iniciado às {startedAt ? formatBRT(new Date(startedAt), "HH:mm") : "--:--"}
                  </p>

                  {/* Stop Button */}
                  <Button 
                    onClick={handleStop}
                    className="w-full"
                    variant="destructive"
                    disabled={isSaving}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    {isSaving ? "Salvando..." : "Parar e Salvar"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

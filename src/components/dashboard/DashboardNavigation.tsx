import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  BarChart3, 
  TrendingDown, 
  PiggyBank, 
  Target,
  ChevronLeft,
  ChevronRight,
  FileSearch
} from 'lucide-react';
import { useDashboardNavigation, SectionGroup } from '@/hooks/useDashboardNavigation';

// Definir os grupos de seções
export const sectionGroups: SectionGroup[] = [
  {
    id: 'diagnostico',
    label: 'Onboarding',
    icon: FileSearch,
    sections: [
      { id: 'resumo', label: 'Resumo', icon: LayoutDashboard },
      { id: 'metricas', label: 'Resultado', icon: BarChart3 },
      { id: 'perdas', label: 'Perdas', icon: TrendingDown },
      { id: 'economia', label: 'Potencial de Ganhos', icon: PiggyBank },
      { id: 'benchmarks', label: 'Benchmarks', icon: Target },
    ]
  }
];

// Array flat para navegação
export const sections = sectionGroups.flatMap(g => g.sections);

export const DashboardNavigation: React.FC = () => {
  const { 
    activeSection, 
    navigateToSection, 
    goToNextSection, 
    goToPreviousSection, 
    getCurrentSectionIndex,
    getTotalSections,
    getCurrentGroup,
    isMobile,
    visibleSections,
    visibleSectionGroups
  } = useDashboardNavigation(sections, sectionGroups);

  if (isMobile) {
    const currentGroup = getCurrentGroup();
    // Mobile: Bottom navigation with prev/next
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousSection}
            disabled={getCurrentSectionIndex() === 0}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex flex-col items-center flex-1 px-2">
            <span className="text-xs text-muted-foreground">
              {currentGroup?.label}
            </span>
            <span className="font-medium text-sm">
              {visibleSections.find(s => s.id === activeSection)?.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {getCurrentSectionIndex() + 1} de {getTotalSections()}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextSection}
            disabled={getCurrentSectionIndex() === getTotalSections() - 1}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop/Tablet: Sticky sidebar with groups
  return (
    <div className="w-64 shrink-0 sticky top-4 self-start">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-foreground">
            Navegação
          </h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
            {getCurrentSectionIndex() + 1}/{getTotalSections()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-muted rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((getCurrentSectionIndex() + 1) / getTotalSections()) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Grouped Sections */}
        <div className="space-y-4">
          {visibleSectionGroups.map((group, groupIndex) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.sections.some(s => s.id === activeSection);

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                <div className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider",
                  isGroupActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <GroupIcon className="h-3.5 w-3.5" />
                  <span>{group.label}</span>
                </div>

                {/* Group Items */}
                <div className="space-y-1 pl-2">
                  {group.sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const globalIndex = visibleSections.findIndex(s => s.id === section.id);
                    const isPassed = globalIndex < getCurrentSectionIndex();

                    return (
                      <button
                        key={section.id}
                        onClick={() => navigateToSection(section.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group relative",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md scale-105"
                            : isPassed
                            ? "text-foreground/70 hover:bg-muted hover:text-foreground"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isPassed && !isActive && "text-primary")} />
                        <span className="text-sm font-medium">{section.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className="absolute right-2 w-1.5 h-1.5 bg-primary-foreground rounded-full"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Separator between groups */}
                {groupIndex < visibleSectionGroups.length - 1 && (
                  <div className="border-t border-border my-3" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

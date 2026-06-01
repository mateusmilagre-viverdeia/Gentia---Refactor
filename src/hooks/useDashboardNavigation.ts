import { useCallback, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useIsMobile } from './use-mobile';

export interface DashboardSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface SectionGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: DashboardSection[];
}

// Seções visíveis no modo compartilhado (cliente)
export const sharedSectionIds = [
  'resumo',
  'metricas', 
  'perdas',
  'economia',
  'benchmarks'
];

// Função para filtrar seções baseado no modo
export const getVisibleSectionGroups = (sectionGroups: SectionGroup[], isSharedView: boolean) => {
  if (!isSharedView) return sectionGroups;

  return sectionGroups
    .map(group => ({
      ...group,
      sections: group.sections.filter(s => sharedSectionIds.includes(s.id))
    }))
    .filter(group => group.sections.length > 0);
};

export const useDashboardNavigation = (sections: DashboardSection[], sectionGroups: SectionGroup[]) => {
  const { activeSection, navigateToSection, isSharedView } = useDashboard();
  const isMobile = useIsMobile();

  // Filtrar seções e grupos baseado no modo de visualização
  const visibleSectionGroups = useMemo(() => 
    getVisibleSectionGroups(sectionGroups, isSharedView), 
    [sectionGroups, isSharedView]
  );

  const visibleSections = useMemo(() => 
    visibleSectionGroups.flatMap(g => g.sections),
    [visibleSectionGroups]
  );

  const goToNextSection = useCallback(() => {
    const currentIndex = visibleSections.findIndex(s => s.id === activeSection);
    if (currentIndex < visibleSections.length - 1) {
      navigateToSection(visibleSections[currentIndex + 1].id);
    }
  }, [activeSection, visibleSections, navigateToSection]);

  const goToPreviousSection = useCallback(() => {
    const currentIndex = visibleSections.findIndex(s => s.id === activeSection);
    if (currentIndex > 0) {
      navigateToSection(visibleSections[currentIndex - 1].id);
    }
  }, [activeSection, visibleSections, navigateToSection]);

  const getCurrentSectionIndex = useCallback(() => {
    return visibleSections.findIndex(s => s.id === activeSection);
  }, [activeSection, visibleSections]);

  const getTotalSections = useCallback(() => {
    return visibleSections.length;
  }, [visibleSections]);

  const getCurrentGroup = useCallback(() => {
    return visibleSectionGroups.find(group => 
      group.sections.some(s => s.id === activeSection)
    );
  }, [activeSection, visibleSectionGroups]);

  return {
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
  };
};

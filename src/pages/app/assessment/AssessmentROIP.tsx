import { useState, useEffect, useRef } from 'react';
import { useAssessmentStore } from '@/store/assessmentStore';
import { useROIPPersistence } from '@/hooks/useROIPPersistence';
import { useBadges } from '@/hooks/useBadges';
import { LandingPage } from '../roip/LandingPage';
import { InstructionsPage } from '../roip/InstructionsPage';
import { AssessmentPage } from '../roip/AssessmentPage';
import { ResultsPage } from '../roip/ResultsPage';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';

type Step = 'landing' | 'instructions' | 'assessment' | 'results';

const AssessmentROIP = () => {
  const [currentStep, setCurrentStep] = useState<Step>('landing');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isNewAssessment, setIsNewAssessment] = useState(false);
  const hasInitialized = useRef(false);
  const hasDiagnosticoBadgeGranted = useRef(false);

  const { reset } = useAssessmentStore();
  const { loadLatestAssessment, createNewAssessment } = useROIPPersistence();
  const { grantBadge, hasBadge } = useBadges();

  // Grant "Diagnóstico Iniciado" badge when user starts assessment
  const grantDiagnosticoIniciado = async () => {
    if (hasDiagnosticoBadgeGranted.current) return;
    hasDiagnosticoBadgeGranted.current = true;
    
    try {
      const { data: badge } = await supabase
        .from('badges')
        .select('id')
        .eq('name', 'Diagnóstico Iniciado')
        .maybeSingle();
      
      if (badge && !hasBadge(badge.id)) {
        await grantBadge(badge.id);
        console.log('[AssessmentROIP] Granted Diagnóstico Iniciado badge');
      }
    } catch (error) {
      console.error('[AssessmentROIP] Failed to grant badge:', error);
    }
  };

  // Check for completed assessment on mount - with ref guard to prevent loops
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAssessment = async () => {
      if (isNewAssessment) {
        await createNewAssessment();
        setIsInitialized(true);
        return;
      }

      const completedAssessment = await loadLatestAssessment();

      if (completedAssessment) {
        setCurrentStep('results');
      } else {
        await createNewAssessment();
      }

      setIsInitialized(true);
    };

    initializeAssessment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = async () => {
    // Reset the ref to allow re-initialization
    hasInitialized.current = false;

    // Step 1: Unmount ResultsPage by going to landing
    setCurrentStep('landing');

    // Step 2: Wait for ResultsPage to fully unmount
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 3: FORCE clear localStorage BEFORE reset
    localStorage.removeItem('assessment-storage');

    // Step 4: Reset Zustand store
    reset();

    // Step 5: Wait and double-check localStorage is clear
    await new Promise(resolve => setTimeout(resolve, 100));
    localStorage.removeItem('assessment-storage');

    // Step 6: Set flags for new assessment and trigger re-init
    setIsNewAssessment(true);
    setIsInitialized(false);

    // Re-initialize with new assessment
    hasInitialized.current = true; // Set to true to prevent double init
    await createNewAssessment();
    setIsInitialized(true);
  };

  // Loading state while checking for existing assessment
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout 
      title="Assessment ROIP" 
      breadcrumb={[
        { label: 'Onboarding', href: '/diagnostico' },
        { label: 'Assessment ROIP' }
      ]}
    >
      {currentStep === 'landing' && (
        <LandingPage onStart={() => setCurrentStep('instructions')} />
      )}
      {currentStep === 'instructions' && (
        <InstructionsPage
          onNext={() => {
            grantDiagnosticoIniciado();
            setCurrentStep('assessment');
          }}
          onBack={() => setCurrentStep('landing')}
        />
      )}
      {currentStep === 'assessment' && (
        <AssessmentPage
          onComplete={() => setCurrentStep('results')}
          onBack={() => setCurrentStep('instructions')}
        />
      )}
      {currentStep === 'results' && (
        <ResultsPage
          onBack={() => setCurrentStep('assessment')}
          onRestart={handleRestart}
        />
      )}
    </AppLayout>
  );
};

export default AssessmentROIP;

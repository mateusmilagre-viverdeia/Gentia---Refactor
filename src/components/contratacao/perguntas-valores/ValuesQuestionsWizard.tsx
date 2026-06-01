import { useState } from 'react';
import { FileText, MessageCircle, Target, Sparkles } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';
import { ValuesQuestionsProgress } from './ValuesQuestionsProgress';
import { QuestionsStageCard } from './QuestionsStageCard';
import { ValueQuestionsCard } from './ValueQuestionsCard';

export function ValuesQuestionsWizard() {
  const { session, updateStage } = useValuesQuestions();
  const [currentValueIndex, setCurrentValueIndex] = useState(0);
  
  const stage = session?.stage || 1;
  const workingValues = session?.working_values || [];

  const handleStage1Back = () => updateStage(0);
  const handleStage1Next = () => updateStage(2);
  
  const handleStage2Back = () => updateStage(1);
  const handleStage2Next = () => {
    setCurrentValueIndex(0);
    updateStage(3);
  };
  
  const handleStage3Back = () => {
    if (currentValueIndex > 0) {
      setCurrentValueIndex(prev => prev - 1);
    } else {
      updateStage(2);
    }
  };
  
  const handleStage3Next = () => {
    if (currentValueIndex < workingValues.length - 1) {
      setCurrentValueIndex(prev => prev + 1);
    } else {
      updateStage(4);
    }
  };
  
  const handleStage3Skip = () => {
    if (currentValueIndex < workingValues.length - 1) {
      setCurrentValueIndex(prev => prev + 1);
    } else {
      updateStage(4);
    }
  };
  
  const handleStage4Back = () => {
    setCurrentValueIndex(workingValues.length - 1);
    updateStage(3);
  };
  const handleStage4Next = () => updateStage(5);

  return (
    <div>
      <ValuesQuestionsProgress 
        currentStage={stage} 
        totalValueStages={workingValues.length}
        currentValueIndex={stage === 3 ? currentValueIndex : undefined}
        maxReachedStage={session?.stage}
        onStageClick={(target) => {
          if (target === 3) setCurrentValueIndex(0);
          updateStage(target);
        }}
      />

      {stage === 1 && (
        <QuestionsStageCard
          stageNumber={1}
          title="Perguntas Iniciais"
          description="Selecione as perguntas básicas e cadastrais para começar a entrevista."
          icon={<FileText className="h-5 w-5" />}
          onBack={handleStage1Back}
          onNext={handleStage1Next}
        />
      )}

      {stage === 2 && (
        <QuestionsStageCard
          stageNumber={2}
          title="Perguntas Coringas Iniciais"
          description="Perguntas para conhecer melhor o candidato e sua trajetória."
          icon={<MessageCircle className="h-5 w-5" />}
          onBack={handleStage2Back}
          onNext={handleStage2Next}
        />
      )}

      {stage === 3 && workingValues.length > 0 && (
        <ValueQuestionsCard
          key={workingValues[currentValueIndex]}
          valueLabel={workingValues[currentValueIndex]}
          valueIndex={currentValueIndex}
          totalValues={workingValues.length}
          onBack={handleStage3Back}
          onNext={handleStage3Next}
          onSkip={handleStage3Skip}
        />
      )}

      {stage === 4 && (
        <QuestionsStageCard
          stageNumber={4}
          title="Perguntas Coringas Finais"
          description="Perguntas finais para encerrar a entrevista e conhecer expectativas."
          icon={<Sparkles className="h-5 w-5" />}
          onBack={handleStage4Back}
          onNext={handleStage4Next}
        />
      )}
    </div>
  );
}

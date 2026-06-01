import { useState } from "react";
import { ArrowLeft, ArrowRight, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDecision } from "@/contexts/DecisionContext";
import { DECISION_QUESTIONS } from "@/types/decision.types";
import { DecisionProgress } from "./DecisionProgress";

export function DecisionReview() {
  const { session, answers, updateStage, updateAnswer, deleteAnswer } = useDecision();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const handleGoToQuestion = async (questionNumber: number) => {
    await updateStage(questionNumber);
  };

  const handleFinalize = async () => {
    await updateStage(9);
  };

  const handleBack = async () => {
    await updateStage(7);
  };

  const startEdit = (answerId: string, currentText: string) => {
    setEditingId(answerId);
    setEditText(currentText);
  };

  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      await updateAnswer(editingId, editText.trim());
      setEditingId(null);
      setEditText("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <DecisionProgress currentStage={8} onStageClick={(s) => updateStage(s)} />

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Revisão Final</h1>
        <p className="text-muted-foreground">
          Revise todas as suas respostas antes de finalizar
        </p>
      </div>

      <div className="space-y-6">
        {DECISION_QUESTIONS.map((question) => {
          const questionAnswers = answers.filter(a => a.question_number === question.number);
          
          return (
            <Card key={question.number} className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {question.number}
                    </div>
                    <CardTitle className="text-base leading-relaxed">
                      {question.question}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGoToQuestion(question.number)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Alterar
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {questionAnswers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhuma resposta adicionada
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {questionAnswers.map((answer) => (
                      <li key={answer.id} className="flex items-start gap-2 group">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        
                        {editingId === answer.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                              <Check className="w-3.5 h-3.5 text-primary" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7">
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{answer.answer_text}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => startEdit(answer.id, answer.answer_text)}
                                className="h-6 w-6"
                              >
                                <Pencil className="w-3 h-3 text-muted-foreground" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteAnswer(answer.id)}
                                className="h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Button onClick={handleFinalize} className="bg-black hover:bg-gray-800">
          Finalizar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

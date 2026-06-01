import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ArrowRight, ArrowLeft, Star, AlertCircle } from 'lucide-react';
import { useValuesQuestions } from '@/contexts/ValuesQuestionsContext';

export function ValuesQuestionsIntro() {
  const { 
    session, 
    companyValues, 
    updateStage, 
    updateWorkingValues,
    addWorkingValue,
    removeWorkingValue 
  } = useValuesQuestions();
  const navigate = useNavigate();
  
  const [newValue, setNewValue] = useState('');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const workingValues = session?.working_values || [];

  // Initialize working values from company values if empty
  const handleInitialize = async () => {
    if (workingValues.length === 0 && companyValues.length > 0) {
      await updateWorkingValues(companyValues);
    }
  };

  const handleAddValue = async () => {
    if (!newValue.trim()) return;
    await addWorkingValue(newValue.trim());
    setNewValue('');
  };

  const handleEditValue = async (oldValue: string) => {
    if (!editText.trim() || oldValue === editText.trim()) {
      setEditingValue(null);
      return;
    }
    
    const newValues = valuesToShow.map(v => v === oldValue ? editText.trim() : v);
    await updateWorkingValues(newValues);
    setEditingValue(null);
  };

  const handleRemoveValue = async (value: string) => {
    await removeWorkingValue(value);
  };

  const handleStart = async () => {
    if (workingValues.length === 0 && companyValues.length > 0) {
      await updateWorkingValues(companyValues);
    }
    await updateStage(1);
  };

  const valuesToShow = workingValues.length > 0 ? workingValues : companyValues;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Valores da Empresa
          </CardTitle>
          <CardDescription>
            Estes são os valores definidos na aba "Criação de Cultura". 
            Você pode adicionar, editar ou remover valores para este questionário específico.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {valuesToShow.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum valor definido. Adicione valores abaixo ou defina-os na aba "Criação de Cultura".
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {valuesToShow.map((value) => (
                <div key={value} className="group relative">
                  {editingValue === value ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-8 w-40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditValue(value);
                          if (e.key === 'Escape') setEditingValue(null);
                        }}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleEditValue(value)}>
                        OK
                      </Button>
                    </div>
                  ) : (
                    <Badge 
                      variant="secondary" 
                      className="text-sm py-1.5 px-3 pr-14 group-hover:pr-14"
                    >
                      {value}
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-5 w-5"
                          onClick={() => {
                            setEditingValue(value);
                            setEditText(value);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover valor?</AlertDialogTitle>
                              <AlertDialogDescription>
                                O valor "{value}" será removido deste questionário. 
                                As perguntas associadas também serão removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveValue(value)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new value */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Adicionar novo valor..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddValue()}
            />
            <Button onClick={handleAddValue} disabled={!newValue.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {workingValues.length === 0 && companyValues.length > 0 && (
            <Button variant="outline" onClick={handleInitialize} className="w-full">
              Usar valores da Criação de Cultura ({companyValues.length} valores)
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/atracao-contratacao/contratacao')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Contratação
        </Button>
        <Button 
          onClick={handleStart}
          disabled={valuesToShow.length === 0}
          size="lg"
        >
          Iniciar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

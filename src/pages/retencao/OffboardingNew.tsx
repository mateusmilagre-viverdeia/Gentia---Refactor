import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ArrowLeft, Save, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOffboardingCases } from '@/hooks/useOffboardingCases';
import { OffboardingTerminationType, getTerminationTypeLabel } from '@/types/offboarding.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAccount } from '@/hooks/useAccount';
import { EmployeeCombobox, SelectedEmployee } from '@/components/offboarding';
import { Badge } from '@/components/ui/badge';
import { formatBRT } from "@/lib/datetime";

interface FormData {
  employee_user_id?: string;
  employee_name: string;
  employee_email: string;
  department: string;
  termination_type: OffboardingTerminationType;
  notice_date: Date | undefined;
  last_day: Date | undefined;
  notes: string;
}

export default function OffboardingNew() {
  const navigate = useNavigate();
  const { createCase, activateCase } = useOffboardingCases();
  const { account } = useAccount();
  
  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    employee_user_id: undefined,
    employee_name: '',
    employee_email: '',
    department: '',
    termination_type: 'voluntary',
    notice_date: undefined,
    last_day: undefined,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmployeeSelect = (employee: SelectedEmployee | null) => {
    if (employee === null) {
      // Manual mode
      setIsManualMode(true);
      setSelectedEmployee(null);
      setFormData(prev => ({
        ...prev,
        employee_user_id: undefined,
        employee_name: '',
        employee_email: '',
        department: '',
      }));
    } else {
      // Selected from list
      setIsManualMode(false);
      setSelectedEmployee(employee);
      setFormData(prev => ({
        ...prev,
        employee_user_id: employee.id,
        employee_name: employee.name,
        employee_email: employee.email,
        department: employee.department || '',
      }));
    }
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setIsManualMode(false);
    setFormData(prev => ({
      ...prev,
      employee_user_id: undefined,
      employee_name: '',
      employee_email: '',
      department: '',
    }));
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    if (!formData.employee_name || !formData.last_day) {
      toast.error('Preencha pelo menos o nome do colaborador e a data do último dia');
      return;
    }

    if (!account?.id) {
      toast.error('Erro ao identificar conta');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCase.mutateAsync({
        account_id: account.id,
        employee_user_id: formData.employee_user_id,
        employee_name: formData.employee_name,
        employee_email: formData.employee_email || undefined,
        department: formData.department || undefined,
        termination_type: formData.termination_type,
        notice_date: formData.notice_date ? formatBRT(formData.notice_date, 'yyyy-MM-dd') : undefined,
        last_day: formatBRT(formData.last_day, 'yyyy-MM-dd'),
        notes: formData.notes || undefined,
      });

      toast.success('Rascunho salvo com sucesso!');
      navigate('/retencao/offboarding');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Erro ao salvar rascunho');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!formData.employee_name || !formData.last_day) {
      toast.error('Preencha pelo menos o nome do colaborador e a data do último dia');
      return;
    }

    if (!account?.id) {
      toast.error('Erro ao identificar conta');
      return;
    }

    setIsSubmitting(true);
    try {
      const caseData = await createCase.mutateAsync({
        account_id: account.id,
        employee_user_id: formData.employee_user_id,
        employee_name: formData.employee_name,
        employee_email: formData.employee_email || undefined,
        department: formData.department || undefined,
        termination_type: formData.termination_type,
        notice_date: formData.notice_date ? formatBRT(formData.notice_date, 'yyyy-MM-dd') : undefined,
        last_day: formatBRT(formData.last_day, 'yyyy-MM-dd'),
        notes: formData.notes || undefined,
      });

      await activateCase.mutateAsync(caseData.id);

      toast.success('Offboarding criado e ativado com sucesso!');
      navigate(`/retencao/offboarding/${caseData.id}`);
    } catch (error) {
      console.error('Error activating offboarding:', error);
      toast.error('Erro ao ativar offboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const terminationTypes: OffboardingTerminationType[] = ['voluntary', 'involuntary', 'contract_end'];

  const showEmployeeFields = selectedEmployee || isManualMode;

  return (
    <AppLayout
      title="Novo Offboarding"
      breadcrumb={[
        { label: 'Retenção', href: '/retencao' },
        { label: 'Offboarding', href: '/retencao/offboarding' },
        { label: 'Novo' },
      ]}
    >
      <div className="container max-w-2xl py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/retencao/offboarding')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Novo Offboarding</h1>
          <p className="text-muted-foreground">
            Configure o processo de desligamento do colaborador
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Colaborador</CardTitle>
            <CardDescription>
              Selecione um colaborador existente ou adicione manualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Selection */}
            {!showEmployeeFields && (
              <div className="space-y-2">
                <Label>Selecionar Colaborador *</Label>
                <EmployeeCombobox
                  onSelect={handleEmployeeSelect}
                  value={selectedEmployee}
                  placeholder="Buscar por nome ou email..."
                />
                <p className="text-xs text-muted-foreground">
                  Busque por nome ou email, ou clique em "Adicionar manualmente"
                </p>
              </div>
            )}

            {/* Selected Employee Info or Manual Fields */}
            {showEmployeeFields && (
              <>
                {/* Selected indicator */}
                {selectedEmployee && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {formData.employee_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{formData.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{formData.employee_email}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {selectedEmployee.source === 'member' ? 'Membro' : 'Colaborador'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearSelection}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Manual mode or editable fields */}
                {isManualMode && (
                  <div className="p-3 rounded-lg bg-muted/50 border mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Modo manual - preencha os dados abaixo
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="employee_name">Nome do Colaborador *</Label>
                  <Input
                    id="employee_name"
                    value={formData.employee_name}
                    onChange={(e) => handleChange('employee_name', e.target.value)}
                    placeholder="Nome completo"
                    disabled={!!selectedEmployee}
                    className={selectedEmployee ? 'bg-muted' : ''}
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="employee_email">Email</Label>
                  <Input
                    id="employee_email"
                    type="email"
                    value={formData.employee_email}
                    onChange={(e) => handleChange('employee_email', e.target.value)}
                    placeholder="email@empresa.com"
                    disabled={!!selectedEmployee}
                    className={selectedEmployee ? 'bg-muted' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessário para envio da pesquisa de desligamento
                  </p>
                </div>

                {/* Department Field */}
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento / Área</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    placeholder="Ex: Comercial, TI, RH"
                  />
                </div>
              </>
            )}

            {/* Only show rest of form after employee selection */}
            {showEmployeeFields && (
              <>
                {/* Tipo de Desligamento */}
                <div className="space-y-2">
                  <Label>Tipo de Desligamento</Label>
                  <Select
                    value={formData.termination_type}
                    onValueChange={(value) => handleChange('termination_type', value as OffboardingTerminationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {terminationTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getTerminationTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do Aviso</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.notice_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.notice_date ? formatBRT(formData.notice_date, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.notice_date}
                          onSelect={(date) => handleChange('notice_date', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Último Dia de Trabalho *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.last_day && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.last_day ? formatBRT(formData.last_day, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.last_day}
                          onSelect={(date) => handleChange('last_day', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Notas adicionais sobre o desligamento..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar Rascunho
                  </Button>
                  <Button
                    onClick={handleActivate}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Ativar Offboarding
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

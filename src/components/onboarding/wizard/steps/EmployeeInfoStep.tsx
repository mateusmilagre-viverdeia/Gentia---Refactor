import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FileText, Wrench, Star, Heart } from 'lucide-react';
import { addDays } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UserSelect } from '@/components/shared/UserSelect';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { JobDescriptionForOnboarding } from '@/types/onboarding-competency.types';
import { formatBRT } from "@/lib/datetime";

const employeeSchema = z.object({
  employee_name: z.string().min(2, 'Nome é obrigatório'),
  employee_email: z.string().email('Email inválido').optional().or(z.literal('')),
  employee_role: z.string().optional(),
  employee_department: z.string().optional(),
  leader_name: z.string().optional(),
  leader_user_id: z.string().optional(),
  hr_responsible_name: z.string().optional(),
  hr_responsible_user_id: z.string().optional(),
  start_date: z.date({ required_error: 'Data de início é obrigatória' }),
  end_date: z.date({ required_error: 'Data de término é obrigatória' }),
  notes: z.string().optional(),
  job_description_id: z.string().optional(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeInfoStepProps {
  data: Partial<EmployeeFormData>;
  onNext: (data: EmployeeFormData) => void;
  onJobDescriptionChange?: (jd: JobDescriptionForOnboarding | null) => void;
}

export function EmployeeInfoStep({ data, onNext, onJobDescriptionChange }: EmployeeInfoStepProps) {
  const { account } = useAccount();
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionForOnboarding[]>([]);
  const [selectedJD, setSelectedJD] = useState<JobDescriptionForOnboarding | null>(null);
  const [isLoadingJDs, setIsLoadingJDs] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_name: data.employee_name || '',
      employee_email: data.employee_email || '',
      employee_role: data.employee_role || '',
      employee_department: data.employee_department || '',
      leader_name: data.leader_name || '',
      leader_user_id: data.leader_user_id || '',
      hr_responsible_name: data.hr_responsible_name || '',
      hr_responsible_user_id: data.hr_responsible_user_id || '',
      start_date: data.start_date || new Date(),
      end_date: data.end_date || addDays(new Date(), 90),
      notes: data.notes || '',
      job_description_id: data.job_description_id || '',
    },
  });

  // Load job descriptions
  useEffect(() => {
    async function loadJobDescriptions() {
      if (!account?.id) return;
      setIsLoadingJDs(true);
      try {
        const { data, error } = await supabase
          .from('job_descriptions')
          .select('id, title, area, required_skills, desired_skills, behavioral_competencies')
          .eq('account_id', account.id)
          .eq('status', 'published')
          .order('title');

        if (error) throw error;
        setJobDescriptions(data || []);
      } catch (err) {
        console.error('Error loading job descriptions:', err);
      } finally {
        setIsLoadingJDs(false);
      }
    }

    loadJobDescriptions();
  }, [account?.id]);

  // Handle JD selection
  const handleJDSelect = (jdId: string) => {
    form.setValue('job_description_id', jdId);

    if (jdId === 'none') {
      setSelectedJD(null);
      onJobDescriptionChange?.(null);
      return;
    }

    const jd = jobDescriptions.find(j => j.id === jdId);
    if (jd) {
      setSelectedJD(jd);
      onJobDescriptionChange?.(jd);
      
      // Auto-fill role and department if empty
      if (!form.getValues('employee_role') && jd.title) {
        form.setValue('employee_role', jd.title);
      }
      if (!form.getValues('employee_department') && jd.area) {
        form.setValue('employee_department', jd.area);
      }
    }
  };

  // Count competencies
  const competencyCount = selectedJD ? 
    (selectedJD.required_skills?.length || 0) + 
    (selectedJD.desired_skills?.length || 0) + 
    (selectedJD.behavioral_competencies?.length || 0) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Colaborador</CardTitle>
        <CardDescription>
          Preencha os dados básicos do novo colaborador
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Colaborador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Analista de Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Description Selection */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-medium">Job Description (Opcional)</h4>
                  <p className="text-sm text-muted-foreground">
                    Vincule ao cargo para avaliar competências do colaborador
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="job_description_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selecionar Job Description</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={handleJDSelect}
                      disabled={isLoadingJDs}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cargo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (pular avaliação)</SelectItem>
                        {jobDescriptions.map((jd) => (
                          <SelectItem key={jd.id} value={jd.id}>
                            {jd.title} {jd.area && `(${jd.area})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Ao selecionar, você poderá avaliar se o colaborador possui as competências do cargo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show competency preview if JD selected */}
              {selectedJD && competencyCount > 0 && (
                <div className="p-3 bg-background rounded border">
                  <p className="text-sm font-medium mb-2">Competências do cargo:</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedJD.required_skills?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        {selectedJD.required_skills?.length} técnicas obrigatórias
                      </Badge>
                    )}
                    {(selectedJD.desired_skills?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" />
                        {selectedJD.desired_skills?.length} técnicas desejáveis
                      </Badge>
                    )}
                    {(selectedJD.behavioral_competencies?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Heart className="h-3 w-3" />
                        {selectedJD.behavioral_competencies?.length} comportamentais
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <FormField
                control={form.control}
                name="leader_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Líder/Gestor</FormLabel>
                    <FormControl>
                      <UserSelect
                        value={field.value || ''}
                        onChange={(userId, userName) => {
                          form.setValue('leader_user_id', userId);
                          form.setValue('leader_name', userName);
                        }}
                        placeholder="Selecione o gestor"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hr_responsible_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável RH</FormLabel>
                    <FormControl>
                      <UserSelect
                        value={field.value || ''}
                        onChange={(userId, userName) => {
                          form.setValue('hr_responsible_user_id', userId);
                          form.setValue('hr_responsible_name', userName);
                        }}
                        placeholder="Selecione o responsável de RH"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              formatBRT(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              formatBRT(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o colaborador ou o processo..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit">Próximo</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, UserCheck, Rocket } from "lucide-react";
import { addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { useRecruitmentOnboardingIntegration } from "@/hooks/useRecruitmentOnboardingIntegration";
import { ConfirmHireDialog, type HireFinancialData } from "@/components/recruitment/financial/ConfirmHireDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

interface HireCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    name: string;
    email?: string;
  };
  application?: {
    id: string;
    jobTitle?: string;
    jobDepartment?: string;
    jobId?: string;
  };
}

export function HireCandidateDialog({
  open,
  onOpenChange,
  candidate,
  application,
}: HireCandidateDialogProps) {
  const navigate = useNavigate();
  const { hireCandidate } = useRecruitmentActions();
  const { templates, createOnboardingFromHire } = useRecruitmentOnboardingIntegration();
  const { currentAccount } = useOrganization();

  const [createOnboarding, setCreateOnboarding] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [employeeRole, setEmployeeRole] = useState(application?.jobTitle || "");
  const [employeeDepartment, setEmployeeDepartment] = useState(application?.jobDepartment || "");
  const [leaderName, setLeaderName] = useState("");
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 97)); // 90 days from start
  const [confirmFeeOpen, setConfirmFeeOpen] = useState(false);

  const isLoading = hireCandidate.isPending || createOnboardingFromHire.isPending;

  useEffect(() => {
    if (application?.jobTitle) {
      setEmployeeRole(application.jobTitle);
    }
    if (application?.jobDepartment) {
      setEmployeeDepartment(application.jobDepartment);
    }
  }, [application]);

  const handleConfirm = async () => {
    // If we have a job context + account, ask user to register fee + warranty first
    if (application?.jobId && currentAccount?.id) {
      setConfirmFeeOpen(true);
      return;
    }
    await runHireFlow();
  };

  const runHireFlow = async (financialData?: HireFinancialData) => {
    try {
      let onboardingProcessId: string | undefined;
      if (createOnboarding) {
        let process;
        try {
          process = await createOnboardingFromHire.mutateAsync({
            candidateId: candidate.id,
            applicationId: application?.id,
            templateId: templateId || undefined,
            employeeRole,
            employeeDepartment,
            leaderName,
            startDate,
            endDate,
          });
        } catch (error) {
          toast.error("Não foi possível criar o onboarding. Verifique os dados e tente novamente, ou desmarque a opção de onboarding para concluir apenas a contratação.");
          throw error;
        }
        onboardingProcessId = process.id;
      }

      await hireCandidate.mutateAsync({
        candidateId: candidate.id,
        applicationId: application?.id,
        jobId: application?.jobId,
        onboardingProcessId,
        hiredAt: financialData?.hiredAt,
        salary: financialData?.salary,
        feeValue: financialData?.feeValue,
        feeDueDate: financialData?.feeDueDate,
        feeNotes: financialData?.feeNotes,
      });

      if (onboardingProcessId) {
        onOpenChange(false);
        navigate(`/retencao/onboarding/${onboardingProcessId}`);
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error in hire process:", error);
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Contratar Candidato
          </DialogTitle>
          <DialogDescription>
            Confirme a contratação e configure o processo de onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Candidate Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="font-medium">{candidate.name}</p>
            {candidate.email && (
              <p className="text-sm text-muted-foreground">{candidate.email}</p>
            )}
            {application?.jobTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                Vaga: {application.jobTitle}
              </p>
            )}
          </div>

          {/* Create Onboarding Toggle */}
          <div className="flex items-center space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="create-onboarding"
              checked={createOnboarding}
              onCheckedChange={(checked) => setCreateOnboarding(!!checked)}
            />
            <div className="flex-1">
              <Label htmlFor="create-onboarding" className="flex items-center gap-2 cursor-pointer">
                <Rocket className="h-4 w-4 text-primary" />
                Criar processo de onboarding automaticamente
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                O onboarding será criado com os dados do candidato
              </p>
            </div>
          </div>

          {/* Onboarding Configuration */}
          {createOnboarding && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              {/* Template Selection */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Template de Onboarding</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Cargo</Label>
                <Input
                  id="role"
                  value={employeeRole}
                  onChange={(e) => setEmployeeRole(e.target.value)}
                  placeholder="Ex: Desenvolvedor Full Stack"
                />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={employeeDepartment}
                  onChange={(e) => setEmployeeDepartment(e.target.value)}
                  placeholder="Ex: Tecnologia"
                />
              </div>

              {/* Leader */}
              <div className="space-y-2">
                <Label htmlFor="leader">Líder Direto</Label>
                <Input
                  id="leader"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Nome do líder responsável"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? formatBRT(startDate, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fim do Onboarding</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? formatBRT(endDate, "dd/MM/yyyy") : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 shrink-0 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || (createOnboarding && !leaderName)}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Confirmar Contratação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {application?.jobId && currentAccount?.id && (
        <ConfirmHireDialog
          open={confirmFeeOpen}
          onOpenChange={setConfirmFeeOpen}
          candidateId={candidate.id}
          candidateName={candidate.name}
          jobId={application.jobId}
          jobTitle={application.jobTitle || ""}
          accountId={currentAccount.id}
          applicationId={application.id}
          onConfirmed={async (financialData) => {
            setConfirmFeeOpen(false);
            await runHireFlow(financialData);
          }}
        />
      )}
    </Dialog>
  );
}

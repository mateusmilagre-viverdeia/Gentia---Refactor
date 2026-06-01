import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEPRole } from "@/hooks/useEPRole";
import { useHeadCS } from "@/hooks/useHeadCS";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Users, Building2, UserPlus, UserMinus, Pencil, Search, Mail, Check, AlertCircle, Loader2, Stethoscope, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import type { EPConsultant, ClientProjectWithProgress } from "@/types/consultant.types";
import { supabase } from "@/integrations/supabase/client";

type EPRoleType = 'ep_consultant' | 'head_cs';

interface DiagnosticResult {
  consultant: {
    id: string;
    name: string;
    email: string;
    user_id: string | null;
    active: boolean;
    profile_exists: boolean;
  };
  assignments: Array<{
    assignment_id: string;
    account_id: string;
    company_name: string;
    assignment_active: boolean;
    can_edit: boolean;
    issues: string[];
  }>;
}

export default function Consultores() {
  const navigate = useNavigate();
  const { isHeadCS, isSuperAdmin, isEPPartner, loading: roleLoading } = useEPRole();
  const { 
    allProjects, 
    allConsultants, 
    loading, 
    assignConsultant, 
    unassignConsultant,
    createConsultant,
    updateConsultant,
    deactivateConsultant,
    reactivateConsultant,
    getProjectConsultants,
    searchUserByEmail,
    sendEPInvite,
  } = useHeadCS();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState<EPConsultant | null>(null);
  const [selectedProject, setSelectedProject] = useState<ClientProjectWithProgress | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    email: "",
    phone: "",
    role: "ep_consultant" as EPRoleType,
  });

  // Search states
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [userFound, setUserFound] = useState<boolean | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Diagnostic states
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [diagnosticConsultant, setDiagnosticConsultant] = useState<EPConsultant | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<EPConsultant | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<EPConsultant | null>(null);
  // Redirect if not authorized
  if (!roleLoading && !isHeadCS && !isSuperAdmin && !isEPPartner) {
    navigate("/");
    return null;
  }

  if (roleLoading || loading) {
    return (
      <AppLayout title="Gestão de Consultores">
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  const handleSearchEmail = async () => {
    if (!searchEmail) {
      toast.error("Digite um email para buscar");
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchUserByEmail(searchEmail);
      if (result) {
        setFormData(prev => ({
          ...prev,
          user_id: result.id,
          name: result.name,
          email: result.email,
        }));
        setUserFound(true);
      } else {
        setFormData(prev => ({
          ...prev,
          user_id: "",
          name: "",
          email: searchEmail,
        }));
        setUserFound(false);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateConsultant = async () => {
    if (!formData.user_id || !formData.name || !formData.email) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const result = await createConsultant({
      user_id: formData.user_id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role,
    });

    if (result) {
      setIsCreateOpen(false);
      resetForm();
      toast.success("Consultor criado com sucesso");
    }
  };

  const handleSendInvite = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Preencha o nome e email");
      return;
    }

    setIsSendingInvite(true);
    try {
      const success = await sendEPInvite({
        email: formData.email,
        name: formData.name,
        role: formData.role,
      });

      if (success) {
        setIsCreateOpen(false);
        resetForm();
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const resetForm = () => {
    setFormData({ user_id: "", name: "", email: "", phone: "", role: "ep_consultant" });
    setSearchEmail("");
    setUserFound(null);
  };

  const handleDiagnose = async (consultant: EPConsultant) => {
    setDiagnosticConsultant(consultant);
    setDiagnosticResult(null);
    setIsDiagnosticOpen(true);
    setDiagnosticLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "diagnose_consultant", consultant_id: consultant.id },
      });

      if (response.error) throw response.error;
      setDiagnosticResult(response.data as DiagnosticResult);
    } catch (err: any) {
      toast.error("Erro ao diagnosticar: " + (err.message || "Erro desconhecido"));
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleUpdateConsultant = async () => {
    if (!selectedConsultant) return;

    const success = await updateConsultant(selectedConsultant.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
    });

    if (success) {
      setIsEditOpen(false);
      setSelectedConsultant(null);
      resetForm();
      toast.success("Consultor atualizado");
    }
  };

  const handleAssign = async (consultantId: string) => {
    if (!selectedProject) return;
    
    const success = await assignConsultant(consultantId, selectedProject.id);
    if (success) {
      setIsAssignOpen(false);
      setSelectedProject(null);
      toast.success("Consultor atribuído ao projeto");
    }
  };

  const handleUnassign = async (consultantId: string, projectId: string) => {
    const success = await unassignConsultant(consultantId, projectId);
    if (success) {
      toast.success("Consultor removido do projeto");
    }
  };

  const openEditDialog = (consultant: EPConsultant) => {
    setSelectedConsultant(consultant);
    setFormData({
      user_id: consultant.user_id,
      name: consultant.name,
      email: consultant.email,
      phone: consultant.phone || "",
      role: "ep_consultant", // Default for editing (role is managed separately)
    });
    setIsEditOpen(true);
  };

  const activeConsultants = allConsultants.filter(c => c.active);
  const projectsWithoutConsultant = allProjects.filter(
    p => !p.consultants || p.consultants.length === 0
  );

  return (
    <AppLayout title="Gestão de Consultores">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gestão de Consultores</h1>
            <p className="text-muted-foreground">
              Gerencie consultores EP e suas atribuições de projetos
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Consultor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Membro EP</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Email Search */}
                <div className="space-y-2">
                  <Label htmlFor="search_email">Email do Usuário *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search_email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={searchEmail}
                      onChange={(e) => {
                        setSearchEmail(e.target.value);
                        setUserFound(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchEmail()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSearchEmail}
                      disabled={isSearching}
                    >
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* Search Result Feedback */}
                  {userFound === true && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      <span>Usuário encontrado no sistema</span>
                    </div>
                  )}
                  {userFound === false && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Usuário não encontrado - será enviado convite por email</span>
                    </div>
                  )}
                </div>

                {/* Role Selector */}
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo EP *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value: EPRoleType) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ep_consultant">Consultor EP</SelectItem>
                      <SelectItem value="head_cs">Head de CS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do consultor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={userFound === true}
                  />
                </div>

                {/* Phone Field (only when user exists) */}
                {userFound === true && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {userFound === true ? (
                  <Button onClick={handleCreateConsultant} className="w-full">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Consultor
                  </Button>
                ) : userFound === false ? (
                  <Button 
                    onClick={handleSendInvite} 
                    className="w-full"
                    disabled={isSendingInvite || !formData.name}
                  >
                    {isSendingInvite ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Enviar Convite por Email
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Busque um email para continuar
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeConsultants.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allProjects.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos sem Consultor</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectsWithoutConsultant.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Consultants List */}
        <Card>
          <CardHeader>
            <CardTitle>Consultores EP</CardTitle>
          </CardHeader>
          <CardContent>
            {allConsultants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum consultor cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Projetos Atribuídos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allConsultants.map((consultant) => {
                    const assignedProjects = allProjects.filter(p => 
                      p.consultants?.some(c => c.id === consultant.id)
                    );
                    return (
                      <TableRow key={consultant.id}>
                        <TableCell className="font-medium">{consultant.name}</TableCell>
                        <TableCell>{consultant.email}</TableCell>
                        <TableCell>{consultant.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={consultant.active ? "default" : "secondary"}>
                            {consultant.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignedProjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedProjects.slice(0, 2).map(p => (
                                <Badge key={p.id} variant="outline" className="text-xs">
                                  {p.name}
                                </Badge>
                              ))}
                              {assignedProjects.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{assignedProjects.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Nenhum</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiagnose(consultant)}
                            title="Diagnosticar acesso"
                          >
                            <Stethoscope className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(consultant)}
                            title="Editar consultor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {consultant.active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivateTarget(consultant)}
                              title="Desativar consultor"
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReactivateTarget(consultant)}
                              title="Reativar consultor"
                              className="text-green-600 hover:text-green-700"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Projects with Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Atribuições de Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Consultores Atribuídos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.map((project) => {
                  const projectConsultants = getProjectConsultants(project.id);
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        {projectConsultants.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {projectConsultants.map(c => (
                              <Badge 
                                key={c.id} 
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {c.name}
                                <button
                                  onClick={() => handleUnassign(c.id, project.id)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  <UserMinus className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Nenhum consultor atribuído
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog 
                          open={isAssignOpen && selectedProject?.id === project.id} 
                          onOpenChange={(open) => {
                            setIsAssignOpen(open);
                            if (!open) setSelectedProject(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProject(project)}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Atribuir
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atribuir Consultor a {project.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select onValueChange={handleAssign}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um consultor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeConsultants
                                    .filter(c => !projectConsultants.some(pc => pc.id === c.id))
                                    .map(consultant => (
                                      <SelectItem key={consultant.id} value={consultant.id}>
                                        {consultant.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Consultor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <Button onClick={handleUpdateConsultant} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diagnostic Dialog */}
        <Dialog open={isDiagnosticOpen} onOpenChange={setIsDiagnosticOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Diagnóstico de Acesso
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {diagnosticLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Verificando acesso...</span>
                </div>
              ) : diagnosticResult ? (
                <>
                  {/* Consultant Status */}
                  <div className="space-y-2 rounded-lg border p-3">
                    <h4 className="font-medium">{diagnosticResult.consultant.name}</h4>
                    <p className="text-sm text-muted-foreground">{diagnosticResult.consultant.email}</p>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        {diagnosticResult.consultant.active ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span>Consultor {diagnosticResult.consultant.active ? "ativo" : "inativo"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {diagnosticResult.consultant.user_id && diagnosticResult.consultant.profile_exists ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span>
                          {diagnosticResult.consultant.user_id
                            ? `user_id: ${diagnosticResult.consultant.user_id.slice(0, 8)}...`
                            : "user_id não vinculado"}
                          {diagnosticResult.consultant.user_id && !diagnosticResult.consultant.profile_exists && " (perfil não encontrado)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignments */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Projetos Atribuídos ({diagnosticResult.assignments.length})</h4>
                    {diagnosticResult.assignments.length === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <ShieldAlert className="h-4 w-4" />
                        Nenhuma atribuição encontrada
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Atribuição</TableHead>
                            <TableHead>Acesso Real</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {diagnosticResult.assignments.map((a) => (
                            <TableRow key={a.assignment_id}>
                              <TableCell className="text-sm font-medium">{a.company_name}</TableCell>
                              <TableCell>
                                <Badge variant={a.assignment_active ? "success" : "destructive"} className="text-[10px]">
                                  {a.assignment_active ? "Ativa" : "Inativa"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {a.can_edit ? (
                                  <Badge variant="success" className="text-[10px]">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                ) : (
                                  <div>
                                    <Badge variant="destructive" className="text-[10px]">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Bloqueado
                                    </Badge>
                                    {a.issues.length > 0 && (
                                      <p className="text-[10px] text-destructive mt-1">
                                        {a.issues.join("; ")}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirmation */}
        <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar Consultor</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja desativar <strong>{deactivateTarget?.name}</strong>? Todas as atribuições de projetos deste consultor serão removidas automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (deactivateTarget) {
                    await deactivateConsultant(deactivateTarget.id);
                    setDeactivateTarget(null);
                  }
                }}
              >
                Desativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Confirmation */}
        <AlertDialog open={!!reactivateTarget} onOpenChange={(open) => !open && setReactivateTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reativar Consultor</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja reativar <strong>{reactivateTarget?.name}</strong>? O consultor poderá ser atribuído a projetos novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                if (reactivateTarget) {
                  await reactivateConsultant(reactivateTarget.id);
                  setReactivateTarget(null);
                }
              }}>
                Reativar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

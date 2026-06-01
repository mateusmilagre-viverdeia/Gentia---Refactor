// Wrapper for the existing Consultores page functionality
// Uses the ConsultoriaLayout instead of AppLayout

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConsultoriaLayout } from "@/components/consultoria";
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
import { Plus, Users, Building2, UserPlus, UserMinus, Pencil, Search, Mail, Check, AlertCircle, Loader2 } from "lucide-react";
import type { EPConsultant, ClientProjectWithProgress } from "@/types/consultant.types";

type EPRoleType = 'ep_consultant' | 'head_cs';

export default function ConsultoriaEquipe() {
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

  // Redirect if not authorized
  if (!roleLoading && !isHeadCS && !isSuperAdmin && !isEPPartner) {
    navigate("/consultoria");
    return null;
  }

  if (roleLoading || loading) {
    return (
      <ConsultoriaLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </ConsultoriaLayout>
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
      role: "ep_consultant",
    });
    setIsEditOpen(true);
  };

  const activeConsultants = allConsultants.filter(c => c.active);
  const projectsWithoutConsultant = allProjects.filter(
    p => !p.consultants || p.consultants.length === 0
  );

  return (
    <ConsultoriaLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Equipe EP</h1>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(consultant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                              <Badge key={c.id} variant="secondary" className="text-xs gap-1">
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
                          <Badge variant="outline" className="text-amber-600">
                            Sem consultor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={isAssignOpen && selectedProject?.id === project.id} onOpenChange={(open) => {
                          setIsAssignOpen(open);
                          if (!open) setSelectedProject(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProject(project)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Atribuir
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Atribuir Consultor</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <p className="text-sm text-muted-foreground">
                                Selecione um consultor para atribuir ao projeto "{project.name}"
                              </p>
                              <div className="space-y-2">
                                {activeConsultants
                                  .filter(c => !projectConsultants.some(pc => pc.id === c.id))
                                  .map(consultant => (
                                    <Button
                                      key={consultant.id}
                                      variant="outline"
                                      className="w-full justify-start"
                                      onClick={() => handleAssign(consultant.id)}
                                    >
                                      <Users className="h-4 w-4 mr-2" />
                                      {consultant.name}
                                    </Button>
                                  ))}
                                {activeConsultants.filter(c => !projectConsultants.some(pc => pc.id === c.id)).length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    Todos os consultores já estão atribuídos a este projeto
                                  </p>
                                )}
                              </div>
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
        <Dialog open={isEditOpen} onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setSelectedConsultant(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Consultor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Nome</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Telefone</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateConsultant}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ConsultoriaLayout>
  );
}

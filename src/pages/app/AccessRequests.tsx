import { useState, useEffect } from "react";
import { Check, X, Loader2, Users, Clock, Mail, User } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccount } from "@/hooks/useAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { roleLabels, AccountRole } from "@/types/account.types";
import { formatBRT } from "@/lib/datetime";

interface AccessRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  requester_name: string;
  target_org_id: string;
  reason: string | null;
  status: string;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

export default function AccessRequests() {
  const { currentOrganization } = useOrganization();
  const { canManage } = useAccount();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    requestId: string;
    action: 'approve' | 'reject';
    requesterName: string;
    selectedRole: AccountRole;
  } | null>(null);

  const loadRequests = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('target_org_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading access requests:", error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentOrganization?.id]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', role?: AccountRole) => {
    setProcessingId(requestId);
    setConfirmDialog(null);

    try {
      const { data, error } = await supabase.functions.invoke('handle-access-request', {
        body: {
          request_id: requestId,
          action,
          role: role || 'member',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data.message || (action === 'approve' ? 'Acesso aprovado!' : 'Solicitação rejeitada'));
      loadRequests();
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(error.message || `Erro ao ${action === 'approve' ? 'aprovar' : 'rejeitar'} solicitação`);
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirmDialog = (request: AccessRequest, action: 'approve' | 'reject') => {
    setConfirmDialog({
      open: true,
      requestId: request.id,
      action,
      requesterName: request.requester_name,
      selectedRole: 'member',
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitações de Acesso</h1>
        <p className="text-muted-foreground">
          Gerencie solicitações de pessoas que desejam ingressar na sua organização.
        </p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Pendentes</CardTitle>
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </div>
          <CardDescription>
            Solicitações aguardando sua análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma solicitação pendente
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{request.requester_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{request.requester_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {request.reason || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatBRT(new Date(request.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog(request, 'reject')}
                          disabled={processingId === request.id}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openConfirmDialog(request, 'approve')}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Histórico</CardTitle>
            </div>
            <CardDescription>
              Solicitações já processadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.requester_name}</TableCell>
                    <TableCell className="text-sm">{request.requester_email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={request.status === 'approved' ? 'default' : 'secondary'}
                        className={request.status === 'approved' ? 'bg-green-500' : ''}
                      >
                        {request.status === 'approved' ? 'Aprovado' : 
                         request.status === 'rejected' ? 'Rejeitado' : 
                         request.status === 'cancelled' ? 'Cancelado' : request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.handled_at 
                        ? formatBRT(new Date(request.handled_at), "dd/MM/yyyy HH:mm")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog?.open} 
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'approve' 
                ? 'Aprovar solicitação' 
                : 'Rejeitar solicitação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'approve' ? (
                <div className="space-y-4">
                  <p>
                    Você está prestes a aprovar o acesso de <strong>{confirmDialog.requesterName}</strong> à organização.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Qual papel deseja atribuir?
                    </label>
                    <Select
                      value={confirmDialog.selectedRole}
                      onValueChange={(value) => 
                        setConfirmDialog(prev => prev ? { ...prev, selectedRole: value as AccountRole } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">{roleLabels.member}</SelectItem>
                        <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                        <SelectItem value="leader">{roleLabels.leader}</SelectItem>
                        <SelectItem value="admin_rh">{roleLabels.admin_rh}</SelectItem>
                        <SelectItem value="admin">{roleLabels.admin}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p>
                  Tem certeza que deseja rejeitar a solicitação de <strong>{confirmDialog?.requesterName}</strong>? 
                  O solicitante será notificado por email.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog) {
                  handleAction(
                    confirmDialog.requestId, 
                    confirmDialog.action, 
                    confirmDialog.action === 'approve' ? confirmDialog.selectedRole : undefined
                  );
                }
              }}
              className={confirmDialog?.action === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmDialog?.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

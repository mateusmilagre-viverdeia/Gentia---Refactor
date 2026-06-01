import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Share2, 
  Copy, 
  Check, 
  Calendar, 
  Eye, 
  Trash2, 
  Link2,
  Loader2
} from "lucide-react";
import { useCultureCodeShare } from "@/hooks/useCultureCodeShare";

import { toast } from "sonner";
import { formatBRTRelative } from "@/lib/datetime";

interface ShareCultureCodeDialogProps {
  fileId: string;
  fileName: string;
}

export function ShareCultureCodeDialog({ fileId, fileName }: ShareCultureCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { shares, isLoading, creating, createShare, deactivateShare, getShareUrl } =
    useCultureCodeShare(fileId);

  const handleCreateShare = () => {
    createShare({ expiresInDays: parseInt(expiresInDays) });
  };

  const handleCopyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(token));
      setCopiedToken(token);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const activeShares = shares?.filter(
    (s) => s.is_active && new Date(s.expires_at) > new Date()
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Compartilhar Código de Cultura
          </DialogTitle>
          <DialogDescription>
            Crie um link público temporário para que colaboradores possam visualizar
            o código de cultura sem precisar de login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Link */}
          <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
            <h4 className="font-medium text-sm">Criar novo link</h4>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="expires">Validade</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger id="expires">
                    <SelectValue placeholder="Selecione a validade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateShare} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Gerar Link
              </Button>
            </div>
          </div>

          {/* Active Links */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              Links ativos
              {activeShares && activeShares.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeShares.length}
                </Badge>
              )}
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : activeShares && activeShares.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {activeShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={getShareUrl(share.token)}
                          className="text-xs h-8 bg-muted/50 font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-8 w-8 p-0"
                          onClick={() => handleCopyLink(share.token)}
                        >
                          {copiedToken === share.token ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expira {formatBRTRelative(new Date(share.expires_at))}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {share.view_count || 0} visualizações
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive shrink-0 h-8 w-8 p-0"
                      onClick={() => deactivateShare(share.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum link ativo. Crie um link acima para compartilhar.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

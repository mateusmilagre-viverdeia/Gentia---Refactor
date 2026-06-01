import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLicenseExpiration, ExpiringLicense } from "@/hooks/useLicenseExpiration";
import { 
  AlertTriangle, 
  Clock, 
  Bell,
  ArrowRight,
  CalendarClock
} from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface ExpiringLicensesAlertProps {
  compact?: boolean;
  onViewDetails?: () => void;
}

export function ExpiringLicensesAlert({ compact = false, onViewDetails }: ExpiringLicensesAlertProps) {
  const navigate = useNavigate();
  const { expiringLicenses, loading, loadExpiringLicenses, getExpirationStatus } = useLicenseExpiration();

  useEffect(() => {
    loadExpiringLicenses(30);
  }, [loadExpiringLicenses]);

  const criticalCount = expiringLicenses.filter(l => l.daysUntilExpiration <= 7).length;
  const warningCount = expiringLicenses.filter(l => l.daysUntilExpiration > 7).length;

  const getStatusBadge = (license: ExpiringLicense) => {
    const status = getExpirationStatus(license.expiresAt);
    
    if (status === 'critical') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {license.daysUntilExpiration} dias
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="h-3 w-3 mr-1" />
        {license.daysUntilExpiration} dias
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  if (expiringLicenses.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Licenças Expirando</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive">{criticalCount} urgente{criticalCount > 1 ? 's' : ''}</Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {warningCount} em breve
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {expiringLicenses.length} licença{expiringLicenses.length > 1 ? 's' : ''} expira{expiringLicenses.length > 1 ? 'm' : ''} nos próximos 30 dias
            </p>
            {onViewDetails && (
              <Button variant="ghost" size="sm" onClick={onViewDetails}>
                Ver detalhes
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle>Licenças Expirando</CardTitle>
              <CardDescription>
                Licenças que expiram nos próximos 30 dias
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">
                {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {warningCount} atenção
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {expiringLicenses.map((license) => (
              <div
                key={license.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{license.accountName}</span>
                    {getStatusBadge(license)}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="truncate">{license.moduleSlug}</span>
                    <span>•</span>
                    <span>
                      Expira em {formatBRT(new Date(license.expiresAt), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!license.expirationNotifiedAt && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Bell className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/consultor/projeto/${license.accountId}?tab=modulos`)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

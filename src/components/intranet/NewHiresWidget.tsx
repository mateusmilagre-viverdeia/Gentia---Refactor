
import { UserPlus, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNewHires } from '@/hooks/useEmployees';
import { formatBRT } from "@/lib/datetime";

export function NewHiresWidget() {
  const { data: newHires, isLoading } = useNewHires();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-500" />
            Novos Colaboradores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-green-500" />
          Novos Colaboradores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!newHires || newHires.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhum novo colaborador nos últimos 30 dias
          </p>
        ) : (
          <>
            {newHires.slice(0, 5).map((employee) => (
              <div 
                key={employee.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9 border-2 border-green-200">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-green-50 text-green-600">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{employee.full_name}</p>
                  <div className="flex items-center gap-2">
                    {employee.job_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {employee.job_title}
                      </p>
                    )}
                    {employee.hire_date && (
                      <span className="text-xs text-green-600">
                        • {formatBRT(new Date(employee.hire_date), "dd/MM")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {newHires.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos ({newHires.length})
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

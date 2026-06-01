
import { Cake, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBirthdays } from '@/hooks/useEmployees';
import { formatBRT } from "@/lib/datetime";

interface BirthdaysWidgetProps {
  showMonth?: boolean;
}

export function BirthdaysWidget({ showMonth = false }: BirthdaysWidgetProps) {
  const { data, isLoading } = useBirthdays();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatBirthday = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatBRT(date, "dd 'de' MMMM");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            Aniversariantes
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

  const displayList = showMonth ? data?.thisMonth : data?.today;
  const hasToday = (data?.today?.length || 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-500" />
            Aniversariantes
          </CardTitle>
          {hasToday && !showMonth && (
            <Badge variant="secondary" className="bg-pink-100 text-pink-700">
              Hoje!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!displayList || displayList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            {showMonth ? 'Nenhum aniversariante este mês' : 'Nenhum aniversariante hoje'}
          </p>
        ) : (
          <>
            {displayList.slice(0, 5).map((employee) => (
              <div 
                key={employee.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-9 w-9 border-2 border-pink-200">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-pink-50 text-pink-600">
                    {getInitials(employee.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{employee.full_name}</p>
                  {showMonth && employee.birth_date && (
                    <p className="text-xs text-muted-foreground">
                      {formatBirthday(employee.birth_date)}
                    </p>
                  )}
                  {employee.job_title && !showMonth && (
                    <p className="text-xs text-muted-foreground truncate">
                      {employee.job_title}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {displayList.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos ({displayList.length})
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

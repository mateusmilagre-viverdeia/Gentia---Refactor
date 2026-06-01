import { useState } from 'react';
import { differenceInDays, isToday, isTomorrow } from "date-fns";
import { Cake, Gift, Calendar, MessageCircle, Star, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMonthlyBirthdays, useBirthdayMessages } from '@/hooks/useBirthdayMessages';
import { BirthdayMessageDialog } from '@/components/intranet/BirthdayMessageDialog';
import { formatBRT } from "@/lib/datetime";

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  birth_date: string | null;
  hire_date: string | null;
}

function BirthdayCard({ employee, onSendMessage }: { 
  employee: Employee; 
  onSendMessage: (emp: Employee) => void;
}) {
  const { messages, isLoading } = useBirthdayMessages(employee.id);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBirthdayInfo = () => {
    if (!employee.birth_date) return null;
    
    const today = new Date();
    const birthDate = new Date(employee.birth_date);
    const thisYearBirthday = new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );

    if (isToday(thisYearBirthday)) {
      return { label: 'Hoje! 🎉', variant: 'default' as const, isSpecial: true };
    }
    if (isTomorrow(thisYearBirthday)) {
      return { label: 'Amanhã', variant: 'secondary' as const, isSpecial: false };
    }
    
    const daysUntil = differenceInDays(thisYearBirthday, today);
    if (daysUntil > 0 && daysUntil <= 7) {
      return { label: `Em ${daysUntil} dias`, variant: 'outline' as const, isSpecial: false };
    }
    
    return { label: formatBRT(thisYearBirthday, "dd 'de' MMMM"), variant: 'outline' as const, isSpecial: false };
  };

  const birthdayInfo = getBirthdayInfo();

  return (
    <Card className={birthdayInfo?.isSpecial ? 'border-pink-300 bg-gradient-to-br from-pink-50 to-purple-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-pink-100 text-pink-600">
                {getInitials(employee.full_name)}
              </AvatarFallback>
            </Avatar>
            {birthdayInfo?.isSpecial && (
              <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1">
                <Star className="h-3 w-3 text-white fill-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">{employee.full_name}</h3>
                {employee.job_title && (
                  <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                )}
                {employee.department && (
                  <p className="text-xs text-muted-foreground">{employee.department}</p>
                )}
              </div>
              {birthdayInfo && (
                <Badge variant={birthdayInfo.variant} className="shrink-0">
                  <Cake className="h-3 w-3 mr-1" />
                  {birthdayInfo.label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Button 
                size="sm" 
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => onSendMessage(employee)}
              >
                <Gift className="h-4 w-4 mr-1" />
                Enviar Parabéns
              </Button>
              {!isLoading && messages.length > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {messages.length} {messages.length === 1 ? 'mensagem' : 'mensagens'}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BirthdaysPage() {
  const { data: birthdays, isLoading } = useMonthlyBirthdays();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentMonth = formatBRT(new Date(), 'MMMM');

  const handleSendMessage = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const todayBirthdays = birthdays?.filter(emp => {
    if (!emp.birth_date) return false;
    const today = new Date();
    const birth = new Date(emp.birth_date);
    const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    return isToday(thisYearBday);
  }) || [];

  const upcomingBirthdays = birthdays?.filter(emp => {
    if (!emp.birth_date) return false;
    const today = new Date();
    const birth = new Date(emp.birth_date);
    const thisYearBday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    return !isToday(thisYearBday);
  }) || [];

  return (
    <AppLayout title="Aniversariantes do Mês" breadcrumb={[{ label: "Home", href: "/" }, { label: "Intranet", href: "/intranet" }, { label: "Aniversariantes" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/intranet">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cake className="h-6 w-6 text-pink-500" />
              Aniversariantes do Mês
            </h1>
            <p className="text-muted-foreground">
              <Calendar className="h-4 w-4 inline mr-1" />
              {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando aniversariantes...</p>
          </div>
        ) : !birthdays?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Cake className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-2">Nenhum aniversariante este mês</h3>
              <p className="text-muted-foreground">
                Cadastre colaboradores com data de nascimento para ver os aniversariantes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Today's birthdays */}
            {todayBirthdays.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  Aniversariantes de Hoje
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {todayBirthdays.map(employee => (
                    <BirthdayCard 
                      key={employee.id} 
                      employee={employee} 
                      onSendMessage={handleSendMessage}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming birthdays */}
            {upcomingBirthdays.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {todayBirthdays.length > 0 ? 'Próximos Aniversários' : 'Aniversariantes do Mês'}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingBirthdays.map(employee => (
                    <BirthdayCard 
                      key={employee.id} 
                      employee={employee} 
                      onSendMessage={handleSendMessage}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Dialog */}
        <BirthdayMessageDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          employee={selectedEmployee}
        />
      </div>
    </AppLayout>
  );
}

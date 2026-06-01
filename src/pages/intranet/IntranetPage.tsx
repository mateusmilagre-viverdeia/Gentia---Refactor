import { AppLayout } from '@/components/layout/AppLayout';
import { IntranetFeed } from '@/components/intranet/IntranetFeed';
import { BirthdaysWidget } from '@/components/intranet/BirthdaysWidget';
import { UpcomingEventsWidget } from '@/components/intranet/UpcomingEventsWidget';
import { NewHiresWidget } from '@/components/intranet/NewHiresWidget';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IntranetPage() {
  return (
    <AppLayout title="Intranet" breadcrumb={[{ label: "Home", href: "/" }, { label: "Intranet" }]}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <IntranetFeed />
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          <Link to="/intranet/diretorio">
            <Card className="group cursor-pointer hover:border-primary/40 transition-all">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">Diretório de Colaboradores</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Veja todos os membros da equipe</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <BirthdaysWidget />
          <UpcomingEventsWidget />
          <NewHiresWidget />
        </div>
      </div>
    </AppLayout>
  );
}

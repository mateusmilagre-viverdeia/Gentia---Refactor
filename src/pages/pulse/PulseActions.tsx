import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutGrid, List, Loader2 } from 'lucide-react';
import { ActionPlanBoard, ActionsList } from '@/components/pulse/actions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function PulseActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's account
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();

        if (!profile?.account_id) {
          setLoading(false);
          return;
        }

        setAccountId(profile.account_id);

        // Check if user has pulse admin or leader role
        const { data: pulseProfile } = await supabase
          .from('pulse_user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .eq('account_id', profile.account_id)
          .eq('is_active', true)
          .single();

        const { data: accountMember } = await supabase
          .from('account_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('account_id', profile.account_id)
          .single();

        const pulseRole = pulseProfile?.role;
        const accountRole = accountMember?.role;

        setHasAccess(
          pulseRole === 'admin_rh' || 
          pulseRole === 'leader' ||
          accountRole === 'owner' || 
          accountRole === 'admin'
        );
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user]);

  if (loading) {
    return (
      <AppLayout title="Planos de Ação">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess || !accountId) {
    return (
      <AppLayout title="Planos de Ação">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para acessar os planos de ação do Pulse.
          </p>
          <Button onClick={() => navigate('/retencao/pulse')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Pulse
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Planos de Ação - Pulse">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/retencao/pulse/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Planos de Ação</h1>
              <p className="text-muted-foreground">
                Gerencie ações de melhoria baseadas nos insights do Pulse
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="board" className="space-y-4">
          <TabsList>
            <TabsTrigger value="board" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Quadro Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <ActionPlanBoard accountId={accountId} />
          </TabsContent>

          <TabsContent value="list">
            <ActionsList accountId={accountId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

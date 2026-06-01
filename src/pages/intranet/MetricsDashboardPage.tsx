import { ArrowLeft, BarChart3, MessageSquare, Heart, CheckCircle, TrendingUp, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIntranetMetrics } from '@/hooks/useIntranetMetrics';

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export default function MetricsDashboardPage() {
  const { data: metrics, isLoading } = useIntranetMetrics();

  const breadcrumb = [{ label: "Home", href: "/" }, { label: "Intranet", href: "/intranet" }, { label: "Métricas" }];

  if (isLoading) {
    return (
        <AppLayout title="Métricas da Intranet" breadcrumb={breadcrumb}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </AppLayout>
    );
  }

  if (!metrics) {
    return (
        <AppLayout title="Métricas da Intranet" breadcrumb={breadcrumb}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Erro ao carregar métricas</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Métricas da Intranet" breadcrumb={breadcrumb}>
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
              <BarChart3 className="h-6 w-6 text-primary" />
              Métricas da Intranet
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o engajamento e performance dos comunicados
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalPosts}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.postsThisMonth} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reações</CardTitle>
              <Heart className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalReactions}</div>
              <p className="text-xs text-muted-foreground">
                Em todos os posts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Comentários</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalComments}</div>
              <p className="text-xs text-muted-foreground">
                Discussões ativas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Confirmação</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.confirmationRate}%</div>
              <p className="text-xs text-muted-foreground">
                Posts com leitura obrigatória
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Engagement Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Engajamento (Últimos 7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={metrics.engagementOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="posts" 
                    stroke="#3b82f6" 
                    name="Posts"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="reactions" 
                    stroke="#ec4899" 
                    name="Reações"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="comments" 
                    stroke="#10b981" 
                    name="Comentários"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reactions by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Reações por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.reactionsByType}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {metrics.reactionsByType.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Posts by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Posts por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.postsByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="type" type="category" width={100} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle>Posts Mais Engajados</CardTitle>
              <CardDescription>Top 5 por reações e comentários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum post com engajamento ainda
                  </p>
                ) : (
                  metrics.topPosts.map((post, index) => (
                    <div 
                      key={post.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.reactions}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {post.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

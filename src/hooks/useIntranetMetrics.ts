import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface IntranetMetrics {
  totalPosts: number;
  postsThisMonth: number;
  totalReactions: number;
  totalComments: number;
  confirmationRate: number;
  reactionsByType: {
    type: string;
    count: number;
  }[];
  topPosts: {
    id: string;
    title: string;
    reactions: number;
    comments: number;
  }[];
  postsByType: {
    type: string;
    count: number;
  }[];
  engagementOverTime: {
    date: string;
    posts: number;
    reactions: number;
    comments: number;
  }[];
}

export function useIntranetMetrics() {
  const { currentOrganization } = useOrganization();
  const accountId = currentOrganization?.id;

  return useQuery({
    queryKey: ['intranet-metrics', accountId],
    queryFn: async (): Promise<IntranetMetrics> => {
      if (!accountId) throw new Error('No organization');

      // Fetch all posts
      const { data: posts, error: postsError } = await supabase
        .from('intranet_posts')
        .select('*')
        .eq('account_id', accountId);

      if (postsError) throw postsError;

      const postIds = posts.map(p => p.id);

      // Fetch reactions
      const { data: reactions, error: reactionsError } = await supabase
        .from('post_reactions')
        .select('*')
        .in('post_id', postIds);

      if (reactionsError) throw reactionsError;

      // Fetch comments
      const { data: comments, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .in('post_id', postIds);

      if (commentsError) throw commentsError;

      // Fetch read confirmations
      const postsRequiringConfirmation = posts.filter(p => p.requires_confirmation);
      const { data: confirmations, error: confirmationsError } = await supabase
        .from('post_read_confirmations')
        .select('*')
        .in('post_id', postsRequiringConfirmation.map(p => p.id));

      if (confirmationsError) throw confirmationsError;

      // Calculate metrics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const postsThisMonth = posts.filter(p => 
        new Date(p.created_at!) >= startOfMonth
      ).length;

      // Reactions by type
      const reactionCounts: Record<string, number> = {};
      reactions?.forEach(r => {
        reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
      });

      const reactionsByType = Object.entries(reactionCounts).map(([type, count]) => ({
        type: type === 'like' ? 'Curtir' : type === 'celebrate' ? 'Comemorar' : 'Apoiar',
        count,
      }));

      // Posts by type
      const typeCounts: Record<string, number> = {};
      posts.forEach(p => {
        typeCounts[p.post_type] = (typeCounts[p.post_type] || 0) + 1;
      });

      const typeLabels: Record<string, string> = {
        birthday: 'Aniversário',
        announcement: 'Comunicado',
        new_hire: 'Novo Colaborador',
        promotion: 'Promoção',
        holiday: 'Feriado',
        custom: 'Geral',
      };

      const postsByType = Object.entries(typeCounts).map(([type, count]) => ({
        type: typeLabels[type] || type,
        count,
      }));

      // Top posts by engagement
      const postEngagement = posts.map(post => {
        const postReactions = reactions?.filter(r => r.post_id === post.id).length || 0;
        const postComments = comments?.filter(c => c.post_id === post.id).length || 0;
        return {
          id: post.id,
          title: post.title,
          reactions: postReactions,
          comments: postComments,
        };
      });

      postEngagement.sort((a, b) => (b.reactions + b.comments) - (a.reactions + a.comments));
      const topPosts = postEngagement.slice(0, 5);

      // Confirmation rate
      let confirmationRate = 0;
      if (postsRequiringConfirmation.length > 0) {
        // This is simplified - in production you'd calculate based on unique users
        const confirmedCount = confirmations?.length || 0;
        const expectedConfirmations = postsRequiringConfirmation.length; // * active users
        confirmationRate = Math.round((confirmedCount / Math.max(expectedConfirmations, 1)) * 100);
      }

      // Engagement over time (last 7 days)
      const engagementOverTime: IntranetMetrics['engagementOverTime'] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayPosts = posts.filter(p => 
          p.created_at?.split('T')[0] === dateStr
        ).length;

        const dayReactions = reactions?.filter(r => 
          r.created_at.split('T')[0] === dateStr
        ).length || 0;

        const dayComments = comments?.filter(c => 
          c.created_at.split('T')[0] === dateStr
        ).length || 0;

        engagementOverTime.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          posts: dayPosts,
          reactions: dayReactions,
          comments: dayComments,
        });
      }

      return {
        totalPosts: posts.length,
        postsThisMonth,
        totalReactions: reactions?.length || 0,
        totalComments: comments?.length || 0,
        confirmationRate,
        reactionsByType,
        topPosts,
        postsByType,
        engagementOverTime,
      };
    },
    enabled: !!accountId,
  });
}

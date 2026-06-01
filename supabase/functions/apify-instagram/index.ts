import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstagramPost {
  id: string;
  shortCode: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
  hashtags?: string[];
}

interface InstagramProfile {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl?: string;
  recentPosts: InstagramPost[];
  postCaptions: string[];
  hashtagsUsed: string[];
  postFrequency?: string;
}

// Extract hashtags from text
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F]+/g);
  return matches ? matches.map(tag => tag.toLowerCase()) : [];
}

// Calculate post frequency description
function calculatePostFrequency(posts: any[]): string {
  if (!posts || posts.length < 2) return 'insufficient_data';
  
  const dates = posts
    .map(p => new Date(p.timestamp || p.takenAt))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  
  if (dates.length < 2) return 'insufficient_data';
  
  const daysDiff = (dates[0].getTime() - dates[dates.length - 1].getTime()) / (1000 * 60 * 60 * 24);
  const avgDaysBetween = daysDiff / (dates.length - 1);
  
  if (avgDaysBetween <= 1) return 'daily';
  if (avgDaysBetween <= 3) return 'several_times_week';
  if (avgDaysBetween <= 7) return 'weekly';
  if (avgDaysBetween <= 14) return 'biweekly';
  if (avgDaysBetween <= 30) return 'monthly';
  return 'infrequent';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, maxPosts = 15 } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL or username is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiToken = Deno.env.get('APIFY_API_TOKEN');
    if (!apiToken) {
      console.error('APIFY_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Apify API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract username from URL or use as-is
    let username = url;
    const usernameMatch = url.match(/instagram\.com\/([^\/\?]+)/);
    if (usernameMatch) {
      username = usernameMatch[1];
    }

    // Clean up username
    username = username.replace('@', '').trim();
    
    console.log('Scraping Instagram profile:', username);

    // Use apify/instagram-scraper - official Apify actor for Instagram profiles
    const actorId = 'apify~instagram-scraper';
    
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usernames: [username],
          resultsLimit: maxPosts,
          proxy: {
            useApifyProxy: true,
          },
        }),
      }
    );

    if (!runResponse.ok) {
      const errorData = await runResponse.json();
      console.error('Apify run error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: `Apify error: ${errorData.error?.message || 'Failed to start actor'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runData = await runResponse.json();
    const runId = runData.data?.id;

    if (!runId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to get run ID from Apify' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Apify run started:', runId);

    // Poll for completion (max 90 seconds)
    let attempts = 0;
    const maxAttempts = 45;
    let runStatus = 'RUNNING';

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`
      );
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        runStatus = statusData.data?.status;
        console.log(`Run status (attempt ${attempts + 1}):`, runStatus);
      }
      
      attempts++;
    }

    if (runStatus !== 'SUCCEEDED') {
      return new Response(
        JSON.stringify({ success: false, error: `Actor run ${runStatus === 'RUNNING' ? 'timed out' : 'failed'}: ${runStatus}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the dataset items
    const datasetResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`
    );

    if (!datasetResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch results from Apify' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items = await datasetResponse.json();
    
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No profile data found', isPrivate: true }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The first item often contains profile info, subsequent items are posts
    const firstItem = items[0];
    const ownerData = firstItem.ownerUsername ? firstItem : (firstItem.owner || {});
    
    // Extract profile data from owner info or first item
    const profileData = {
      username: ownerData.ownerUsername || ownerData.username || username,
      fullName: ownerData.ownerFullName || ownerData.fullName || ownerData.full_name,
      biography: ownerData.biography || ownerData.bio,
      profilePicUrl: ownerData.profilePicUrl || ownerData.profilePicture,
      followersCount: ownerData.followersCount || ownerData.followers || 0,
      followingCount: ownerData.followingCount || ownerData.following || 0,
      postsCount: ownerData.postsCount || ownerData.posts?.length || items.length,
      isVerified: ownerData.verified || ownerData.isVerified || false,
      isPrivate: ownerData.private || ownerData.isPrivate || false,
      externalUrl: ownerData.externalUrl || ownerData.website,
    };

    // Check if profile is private
    if (profileData.isPrivate) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...profileData,
            recentPosts: [],
            postCaptions: [],
            hashtagsUsed: [],
          },
          isPrivate: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract posts (items are usually posts when resultsType is 'posts')
    const allHashtags: string[] = [];
    const allCaptions: string[] = [];
    
    const recentPosts: InstagramPost[] = items
      .filter((item: any) => item.shortCode || item.id)
      .slice(0, maxPosts)
      .map((post: any) => {
        const caption = post.caption || post.text || '';
        const hashtags = extractHashtags(caption);
        
        if (caption) allCaptions.push(caption);
        allHashtags.push(...hashtags);
        
        return {
          id: post.id || post.pk,
          shortCode: post.shortCode || post.code,
          caption: caption,
          likesCount: post.likesCount || post.likes || 0,
          commentsCount: post.commentsCount || post.comments || 0,
          timestamp: post.timestamp || post.takenAt || post.takenAtTimestamp,
          imageUrl: post.displayUrl || post.imageUrl || post.url,
          videoUrl: post.videoUrl,
          isVideo: post.isVideo || post.type === 'Video' || post.videoUrl != null,
          hashtags: hashtags,
        };
      });

    // Count unique hashtags
    const hashtagCounts = allHashtags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get most used hashtags (sorted by frequency)
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

    // Calculate post frequency
    const postFrequency = calculatePostFrequency(recentPosts);

    // Transform to our standard format
    const profile: InstagramProfile = {
      username: profileData.username,
      fullName: profileData.fullName,
      biography: profileData.biography,
      profilePicUrl: profileData.profilePicUrl,
      followersCount: profileData.followersCount,
      followingCount: profileData.followingCount,
      postsCount: profileData.postsCount,
      isVerified: profileData.isVerified,
      isPrivate: profileData.isPrivate,
      externalUrl: profileData.externalUrl,
      recentPosts: recentPosts,
      postCaptions: allCaptions,
      hashtagsUsed: topHashtags,
      postFrequency: postFrequency,
    };

    console.log('Instagram profile scraped successfully:', profile.username, `with ${recentPosts.length} posts`);

    return new Response(
      JSON.stringify({ success: true, data: profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping Instagram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape Instagram profile';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

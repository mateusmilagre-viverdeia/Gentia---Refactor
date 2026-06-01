import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInExperience {
  title: string;
  company: string;
  companyUrl?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
}

interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
}

interface LinkedInProfile {
  fullName: string;
  headline?: string;
  location?: string;
  summary?: string;
  profileUrl: string;
  profilePicture?: string;
  skills: string[];
  experiences: LinkedInExperience[];
  education: LinkedInEducation[];
  certifications?: string[];
  languages?: string[];
  connectionsCount?: number;
  email?: string;
  phone?: string;
  posts: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, includePosts = false } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
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

    // Extract username from URL
    const usernameMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (!usernameMatch) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid LinkedIn profile URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileUrl = url.includes('http') ? url : `https://${url}`;
    console.log('Scraping LinkedIn profile with Dev Fusion (no cookies):', profileUrl);

    // Actor: Dev Fusion Mass LinkedIn Profile Scraper (no session cookie needed)
    const actorId = 'dev_fusion~LinkedIn-Profile-Scraper';
    
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileUrls: [profileUrl],
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

    console.log('Apify Dev Fusion run started:', runId);

    // Poll for completion (max 120 seconds)
    let attempts = 0;
    const maxAttempts = 60;
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

    const rawProfile = items[0];
    console.log('[apify-linkedin] Dev Fusion RAW KEYS:', Object.keys(rawProfile).join(', '));

    // === DEV FUSION FIELD MAPPING ===
    // Skills: handle both string[] and {title}[]
    let skills: string[] = [];
    if (Array.isArray(rawProfile.skills)) {
      skills = rawProfile.skills.map((s: any) => {
        if (typeof s === 'string') return s;
        return s.title || s.name || s.skill || '';
      }).filter((s: string) => s && s.length > 0);
    }

    // Languages
    const languagesRaw = rawProfile.languages || [];
    const languages = Array.isArray(languagesRaw)
      ? languagesRaw.map((l: any) => typeof l === 'string' ? l : (l.name || l.language || l.title || ''))
      : [];

    // Certifications
    const certificationsRaw = rawProfile.certifications || rawProfile.certificates || [];
    const certifications = Array.isArray(certificationsRaw)
      ? certificationsRaw.map((c: any) => typeof c === 'string' ? c : (c.name || c.title || ''))
      : [];

    // Experiences
    const experiencesRaw = rawProfile.experiences || rawProfile.experience || rawProfile.positions || [];

    // Educations
    const educationsRaw = rawProfile.educations || rawProfile.education || rawProfile.schools || [];

    const profile: LinkedInProfile = {
      fullName: rawProfile.fullName || rawProfile.name || 
        (rawProfile.firstName && rawProfile.lastName ? `${rawProfile.firstName} ${rawProfile.lastName}` : '') || 'Unknown',
      headline: rawProfile.headline || rawProfile.title || rawProfile.occupation,
      location: rawProfile.location || rawProfile.geoLocation || rawProfile.locationName,
      summary: rawProfile.summary || rawProfile.about || rawProfile.bio,
      profileUrl: profileUrl,
      profilePicture: rawProfile.profilePicture || rawProfile.profilePictureUrl || rawProfile.avatar || rawProfile.profilePic,
      skills,
      experiences: experiencesRaw.map((exp: any) => ({
        title: exp.title || exp.position || exp.role,
        company: exp.company || exp.companyName || exp.organization,
        companyUrl: exp.companyUrl || exp.companyLinkedInUrl,
        duration: exp.duration || exp.timePeriod,
        startDate: exp.startDate || exp.starts || exp.from,
        endDate: exp.endDate || exp.ends || exp.to,
        location: exp.location || exp.geoLocation,
        description: exp.description || exp.summary,
      })),
      education: educationsRaw.map((edu: any) => ({
        school: edu.university || edu.schoolName || edu.school || edu.institution,
        degree: edu.degree || edu.degreeName,
        fieldOfStudy: edu.fieldOfStudy || edu.field || edu.major,
        startDate: edu.startDate || edu.starts || edu.from,
        endDate: edu.endDate || edu.ends || edu.to,
      })),
      certifications,
      languages,
      connectionsCount: rawProfile.connectionsCount || rawProfile.connections,
      email: rawProfile.email || undefined,
      phone: rawProfile.phone || rawProfile.phoneNumber || undefined,
      posts: [],
    };

    console.log('LinkedIn profile scraped successfully via Dev Fusion:', profile.fullName, 
      `| email: ${profile.email ? 'yes' : 'no'} | phone: ${profile.phone ? 'yes' : 'no'}`);

    return new Response(
      JSON.stringify({ success: true, data: profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping LinkedIn:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape LinkedIn profile';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

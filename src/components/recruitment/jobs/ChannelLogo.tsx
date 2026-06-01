import linkedinLogo from '@/assets/logos/linkedin.svg';
import indeedLogo from '@/assets/logos/indeed.png';
import vagasLogo from '@/assets/logos/vagas.webp';
import infojobsLogo from '@/assets/logos/infojobs.webp';
import cathoLogo from '@/assets/logos/catho.png';
import googleJobsLogo from '@/assets/logos/google-jobs.png';
import careerjetLogo from '@/assets/logos/careerjet.webp';
import joraLogo from '@/assets/logos/jora.png';
import joobleLogo from '@/assets/logos/jooble.avif';

const CHANNEL_LOGOS: Record<string, string> = {
  linkedin_api: linkedinLogo,
  linkedin_limited: linkedinLogo,
  indeed_api: indeedLogo,
  vagas_com: vagasLogo,
  infojobs_api: infojobsLogo,
  catho: cathoLogo,
  google_jobs: googleJobsLogo,
  careerjet: careerjetLogo,
  jora: joraLogo,
  jooble: joobleLogo,
};

interface ChannelLogoProps {
  channelName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fallbackIcon?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: 'h-4 w-6',
  sm: 'h-6 w-10',
  md: 'h-8 w-12',
  lg: 'h-10 w-16',
};

export function ChannelLogo({ channelName, size = 'sm', fallbackIcon, className = '' }: ChannelLogoProps) {
  const logo = CHANNEL_LOGOS[channelName];

  if (!logo) {
    return <span className={className}>{fallbackIcon || '📋'}</span>;
  }

  return (
    <div className={`${SIZE_MAP[size]} flex items-center justify-center shrink-0 ${className}`}>
      <img
        src={logo}
        alt={channelName}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

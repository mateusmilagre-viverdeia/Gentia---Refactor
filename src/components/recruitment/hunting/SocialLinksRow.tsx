import { Linkedin, Instagram, Github, Twitter, Globe } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type SocialLinks = {
  linkedin?: string;
  instagram?: string;
  github?: string;
  twitter?: string;
  website?: string;
};

interface Props {
  links?: SocialLinks | null;
  size?: 'sm' | 'md';
  className?: string;
}

const ICONS: Array<{ key: keyof SocialLinks; Icon: typeof Linkedin; label: string }> = [
  { key: 'linkedin', Icon: Linkedin, label: 'LinkedIn' },
  { key: 'instagram', Icon: Instagram, label: 'Instagram' },
  { key: 'github', Icon: Github, label: 'GitHub' },
  { key: 'twitter', Icon: Twitter, label: 'Twitter / X' },
  { key: 'website', Icon: Globe, label: 'Site' },
];

export function SocialLinksRow({ links, size = 'sm', className }: Props) {
  if (!links) return null;
  const items = ICONS.filter(({ key }) => !!links[key]);
  if (items.length === 0) return null;
  const sz = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
        {items.map(({ key, Icon, label }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <a
                href={links[key]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label={label}
              >
                <Icon className={sz} />
              </a>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[260px] break-all">
              {links[key]}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

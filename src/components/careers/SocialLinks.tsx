import { 
  Instagram, 
  Linkedin, 
  Facebook, 
  Youtube, 
  Twitter, 
  Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SocialLinksProps {
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  twitter?: string | null;
  website?: string | null;
  primaryColor?: string;
  className?: string;
}

export function SocialLinks({
  instagram,
  linkedin,
  facebook,
  youtube,
  twitter,
  website,
  primaryColor = "#000000",
  className = "",
}: SocialLinksProps) {
  const links = [
    { url: instagram, icon: Instagram, label: "Instagram" },
    { url: linkedin, icon: Linkedin, label: "LinkedIn" },
    { url: facebook, icon: Facebook, label: "Facebook" },
    { url: youtube, icon: Youtube, label: "YouTube" },
    { url: twitter, icon: Twitter, label: "Twitter" },
    { url: website, icon: Globe, label: "Website" },
  ].filter(link => link.url);

  if (links.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {links.map(({ url, icon: Icon, label }) => (
        <Button
          key={label}
          variant="ghost"
          size="icon"
          asChild
          className="h-9 w-9 hover:bg-primary/10 transition-colors"
        >
          <a
            href={url!}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            style={{ 
              "--hover-color": primaryColor 
            } as React.CSSProperties}
            className="hover:text-primary"
          >
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      ))}
    </div>
  );
}

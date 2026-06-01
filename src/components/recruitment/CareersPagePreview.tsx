import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, ArrowRight, Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellingContentBlock {
  id: string;
  emoji: string;
  title: string;
  content: string;
}

interface SellingContentData {
  blocks: SellingContentBlock[];
  hasApprovedContent: boolean;
}

interface CareersPagePreviewProps {
  companyName: string;
  headline: string;
  description: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  showCompanyName: boolean;
  showDepartmentFilter: boolean;
  showLocationFilter: boolean;
  sellingContent?: SellingContentData;
  useSellingContent?: boolean;
  className?: string;
}

// Mock jobs for preview
const mockJobs = [
  {
    id: "1",
    title: "Desenvolvedor Full Stack",
    department: "Tecnologia",
    location: "São Paulo, SP",
    employment_type: "CLT",
  },
  {
    id: "2",
    title: "Designer UX/UI",
    department: "Design",
    location: "Remoto",
    employment_type: "PJ",
  },
  {
    id: "3",
    title: "Analista de Marketing",
    department: "Marketing",
    location: "Rio de Janeiro, RJ",
    employment_type: "CLT",
  },
];

export function CareersPagePreview({
  companyName,
  headline,
  description,
  logoUrl,
  coverImageUrl,
  primaryColor,
  showCompanyName,
  showDepartmentFilter,
  showLocationFilter,
  sellingContent,
  useSellingContent,
  className,
}: CareersPagePreviewProps) {
  const categories = ["Todos", "Tecnologia", "Design", "Marketing"];
  const locations = ["Todas as Localizações", "São Paulo, SP", "Rio de Janeiro, RJ", "Remoto"];

  return (
    <div className={cn("bg-background border rounded-lg overflow-hidden shadow-sm", className)}>
      {/* Scale wrapper for miniature preview */}
      <div className="origin-top-left" style={{ transform: "scale(0.6)", width: "166.67%", height: "auto" }}>
        {/* Cover Image */}
        {coverImageUrl && (
          <div className="relative h-32 bg-muted">
            <img
              src={coverImageUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
          </div>
        )}

        {/* Header */}
        <header className="border-b border-border" style={{ backgroundColor: `${primaryColor}08` }}>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="w-8 h-8 rounded-lg object-contain"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-white font-bold text-sm">
                      {companyName.charAt(0)}
                    </span>
                  </div>
                )}
                {showCompanyName && (
                  <span className="font-semibold">{companyName}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Globe className="h-3 w-3" />
                <span>PT-BR</span>
              </div>
            </div>
            <h1 className="text-lg font-bold mb-1">{headline || "Oportunidades de Carreira"}</h1>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description || `Junte-se à equipe da ${companyName}`}
            </p>
          </div>
        </header>

        {/* Selling Content Section (Preview) - Shows all 8 sections */}
        {useSellingContent && sellingContent?.hasApprovedContent && sellingContent.blocks.length > 0 && (
          <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/30">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Vendendo a Empresa
            </div>
            <div className="space-y-1.5">
              {sellingContent.blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 text-xs">
                  <span>{block.emoji}</span>
                  <span className="text-foreground/80 truncate">{block.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vagas Abertas (3)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {showDepartmentFilter && (
              <div className="flex gap-1">
                {categories.slice(0, 3).map((cat, i) => (
                  <Badge
                    key={cat}
                    variant={i === 0 ? "default" : "secondary"}
                    className="text-xs cursor-pointer"
                    style={i === 0 ? { backgroundColor: primaryColor } : {}}
                  >
                    {cat}
                  </Badge>
                ))}
                <Badge variant="secondary" className="text-xs">+1</Badge>
              </div>
            )}

            {showLocationFilter && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground border rounded px-2 py-1">
                <MapPin className="h-3 w-3" />
                <span>Todas</span>
              </div>
            )}
          </div>
        </div>

        {/* Jobs List */}
        <div className="divide-y divide-border border-t">
          {mockJobs.map((job) => (
            <div key={job.id} className="px-4 py-3 hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{job.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {job.department}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {job.employment_type}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" style={{ color: primaryColor }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-border py-3 px-4">
          <p className="text-center text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} {companyName}. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}

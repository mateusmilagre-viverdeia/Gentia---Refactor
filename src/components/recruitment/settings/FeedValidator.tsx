import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw,
  FileText,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ValidationResult {
  isValid: boolean;
  jobCount: number;
  checks: {
    company: boolean;
    location: boolean;
    salary: boolean;
    title: boolean;
    description: boolean;
    url: boolean;
    date: boolean;
  };
  lastUpdated?: string;
  error?: string;
}

interface FeedValidatorProps {
  feedUrl: string | null;
}

export function FeedValidator({ feedUrl }: FeedValidatorProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validateFeed = async () => {
    if (!feedUrl) {
      toast.error('URL do feed não disponível');
      return;
    }

    setIsValidating(true);
    setResult(null);

    try {
      const response = await fetch(feedUrl);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const xml = await response.text();
      
      // Simple XML parsing to count jobs and check fields
      const jobMatches = xml.match(/<job[\s>]/g) || [];
      const jobCount = jobMatches.length;
      
      // Check for required fields
      const hasCompany = xml.includes('<company>');
      const hasLocation = xml.includes('<location>') || xml.includes('<city>');
      const hasSalary = xml.includes('<salary>');
      const hasTitle = xml.includes('<title>');
      const hasDescription = xml.includes('<description>');
      const hasUrl = xml.includes('<url>') || xml.includes('<apply_url>');
      const hasDate = xml.includes('<date>') || xml.includes('<posted_date>');
      
      const validation: ValidationResult = {
        isValid: jobCount > 0 && hasTitle && hasCompany,
        jobCount,
        checks: {
          company: hasCompany,
          location: hasLocation,
          salary: hasSalary,
          title: hasTitle,
          description: hasDescription,
          url: hasUrl,
          date: hasDate,
        },
        lastUpdated: new Date().toISOString(),
      };
      
      setResult(validation);
      
      if (validation.isValid) {
        toast.success(`Feed válido! ${jobCount} vaga(s) encontrada(s)`);
      } else if (jobCount === 0) {
        toast.warning('Nenhuma vaga encontrada no feed');
      } else {
        toast.warning('Feed incompleto - verifique os campos');
      }
      
    } catch (error) {
      console.error('[FeedValidator] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      setResult({
        isValid: false,
        jobCount: 0,
        checks: {
          company: false,
          location: false,
          salary: false,
          title: false,
          description: false,
          url: false,
          date: false,
        },
        error: errorMessage,
      });
      
      toast.error(`Erro ao validar feed: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  const CheckItem = ({ 
    label, 
    checked, 
    icon: Icon,
    required = false,
  }: { 
    label: string; 
    checked: boolean;
    icon: React.ElementType;
    required?: boolean;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className={`h-4 w-4 ${required ? 'text-red-500' : 'text-muted-foreground'}`} />
      )}
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      {required && !checked && (
        <Badge variant="destructive" className="text-[10px] px-1 py-0">
          Obrigatório
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-sm">Validador de Feed</h4>
          <p className="text-xs text-muted-foreground">
            Verifique se seu feed está formatado corretamente
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={validateFeed}
          disabled={isValidating || !feedUrl}
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Validar Feed
        </Button>
      </div>

      {result && (
        <div className={`p-4 rounded-lg border ${
          result.isValid 
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
            : result.error 
              ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
        }`}>
          {result.error ? (
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-300">
                  Erro ao acessar feed
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {result.error}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-medium">
                    {result.jobCount} vaga{result.jobCount !== 1 ? 's' : ''} no feed
                  </span>
                </div>
                {result.lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    Validado: {new Date(result.lastUpdated).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CheckItem 
                  label="Título" 
                  checked={result.checks.title} 
                  icon={FileText}
                  required
                />
                <CheckItem 
                  label="Empresa" 
                  checked={result.checks.company} 
                  icon={Building2}
                  required
                />
                <CheckItem 
                  label="Localização" 
                  checked={result.checks.location} 
                  icon={MapPin}
                />
                <CheckItem 
                  label="Salário" 
                  checked={result.checks.salary} 
                  icon={DollarSign}
                />
                <CheckItem 
                  label="URL" 
                  checked={result.checks.url} 
                  icon={FileText}
                />
                <CheckItem 
                  label="Data" 
                  checked={result.checks.date} 
                  icon={Calendar}
                />
              </div>

              {result.jobCount === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Certifique-se de ter vagas ativas com visibilidade pública
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

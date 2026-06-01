import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EvabootCsvImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searches: Array<{ id: string; query: string; job_id?: string | null }>;
  jobs: Array<{ id: string; title: string }>;
  onImportComplete: () => void;
}

interface PreviewRow {
  name: string;
  title: string;
  company: string;
  linkedin: string;
  email: string;
}

export function EvabootCsvImport({
  open,
  onOpenChange,
  searches,
  jobs,
  onImportComplete,
}: EvabootCsvImportProps) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedSearchId, setSelectedSearchId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [query, setQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ new_candidates: number; duplicates: number; skipped: number; search_id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setCsvText(null);
    setFileName("");
    setPreview([]);
    setTotalRows(0);
    setMode("existing");
    setSelectedSearchId("");
    setSelectedJobId("");
    setQuery("");
    setIsImporting(false);
    setResult(null);
  }, []);

  const normalizeText = (text: string): string => {
    let cleaned = text;
    if (cleaned.charCodeAt(0) === 0xFEFF || cleaned.charCodeAt(0) === 0xFFFE) {
      cleaned = cleaned.slice(1);
    }
    cleaned = cleaned.replace(/\0/g, '');
    return cleaned;
  };

  const detectDelimiter = (headerLine: string): string => {
    const tabCount = (headerLine.match(/\t/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semiCount = (headerLine.match(/;/g) || []).length;
    if (tabCount >= commaCount && tabCount >= semiCount) return '\t';
    if (semiCount >= commaCount) return ';';
    return ',';
  };

  const parseCSVRecords = (text: string): string[][] => {
    const normalized = normalizeText(text).trim();
    if (!normalized) return [];

    // Detect delimiter from first line
    let firstLine = '';
    {
      let inQ = false;
      for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        if (ch === '"') inQ = !inQ;
        if (!inQ && (ch === '\n' || ch === '\r')) break;
        firstLine += ch;
      }
    }
    const delimiter = detectDelimiter(firstLine);

    const records: string[][] = [];
    let currentField = '';
    let currentRecord: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < normalized.length && normalized[i + 1] === '"') {
            currentField += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          currentRecord.push(currentField.trim());
          currentField = '';
        } else if (ch === '\r') {
          // skip
        } else if (ch === '\n') {
          currentRecord.push(currentField.trim());
          currentField = '';
          if (currentRecord.some(f => f.length > 0)) {
            records.push(currentRecord);
          }
          currentRecord = [];
        } else {
          currentField += ch;
        }
      }
    }
    currentRecord.push(currentField.trim());
    if (currentRecord.some(f => f.length > 0)) {
      records.push(currentRecord);
    }
    return records;
  };

  const handleFileRead = useCallback((text: string, name: string) => {
    setCsvText(text);
    setFileName(name);
    setResult(null);

    const records = parseCSVRecords(text);
    if (records.length < 2) {
      toast.error("CSV vazio ou inválido");
      return;
    }

    const headers = records[0].map(h => h.replace(/"/g, "").trim().toLowerCase());
    const findIdx = (...names: string[]) => {
      for (const n of names) {
        const idx = headers.findIndex((h) => h.replace(/[_\s-]/g, "") === n.replace(/[_\s-]/g, ""));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const nameIdx = findIdx("fullname", "full_name", "name");
    const firstIdx = findIdx("firstname", "first_name");
    const lastIdx = findIdx("lastname", "last_name");
    const titleIdx = findIdx("jobtitle", "job_title", "currentjob", "title", "headline");
    const companyIdx = findIdx("companyname", "company_name", "company");
    const linkedinIdx = findIdx("linkedinurlpublic", "linkedinurluniqueid", "linkedinurl", "linkedin_url", "profileurl", "linkedinprofileurl");
    const emailIdx = findIdx("email", "professionalemail");

    const dataRecords = records.slice(1);
    const rows: PreviewRow[] = [];
    const max = Math.min(dataRecords.length, 5);
    for (let i = 0; i < max; i++) {
      const vals = dataRecords[i];
      const name =
        (nameIdx >= 0 ? vals[nameIdx] : "") ||
        `${firstIdx >= 0 ? vals[firstIdx] || "" : ""} ${lastIdx >= 0 ? vals[lastIdx] || "" : ""}`.trim();
      rows.push({
        name,
        title: titleIdx >= 0 ? vals[titleIdx] || "" : "",
        company: companyIdx >= 0 ? vals[companyIdx] || "" : "",
        linkedin: linkedinIdx >= 0 ? vals[linkedinIdx] || "" : "",
        email: emailIdx >= 0 ? vals[emailIdx] || "" : "",
      });
    }

    setPreview(rows);
    setTotalRows(dataRecords.length);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.endsWith(".csv")) {
        toast.error("Apenas arquivos .csv são aceitos");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // If we detect null bytes (UTF-16 read as UTF-8), re-read as UTF-16
        if (result.includes('\0')) {
          const reader16 = new FileReader();
          reader16.onload = () => handleFileRead(reader16.result as string, file.name);
          reader16.readAsText(file, 'utf-16');
        } else {
          handleFileRead(result, file.name);
        }
      };
      reader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (result.includes('\0')) {
          const reader16 = new FileReader();
          reader16.onload = () => handleFileRead(reader16.result as string, file.name);
          reader16.readAsText(file, 'utf-16');
        } else {
          handleFileRead(result, file.name);
        }
      };
      reader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleImport = async () => {
    if (!csvText) return;

    const body: Record<string, unknown> = { csv_text: csvText };

    if (mode === "existing") {
      if (!selectedSearchId) {
        toast.error("Selecione uma busca existente");
        return;
      }
      body.search_id = selectedSearchId;
    } else {
      if (!selectedJobId) {
        toast.error("Selecione uma vaga");
        return;
      }
      body.job_id = selectedJobId;
      body.query = query || `Importação Evaboot - ${new Date().toLocaleDateString("pt-BR")}`;
    }

    setIsImporting(true);

    try {
      const { data, error } = await supabase.functions.invoke("hunting-import-evaboot-csv", {
        body,
      });

      if (error) {
        toast.error("Erro na importação: " + error.message);
        setIsImporting(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setIsImporting(false);
        return;
      }

      setResult(data);
      toast.success(`${data.new_candidates} leads importados com sucesso!`);
      onImportComplete();
    } catch (err) {
      toast.error("Erro inesperado na importação");
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar CSV do Evaboot
          </DialogTitle>
          <DialogDescription>
            Importe leads exportados do LinkedIn Sales Navigator via Evaboot. Os candidatos serão analisados e pontuados automaticamente.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Importação concluída!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.new_candidates} novos leads importados
                  {result.duplicates > 0 && ` · ${result.duplicates} duplicados ignorados`}
                  {result.skipped > 0 && ` · ${result.skipped} sem LinkedIn URL`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  O scraping e scoring dos perfis está sendo processado em segundo plano.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { resetState(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload area */}
            {!csvText ? (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Arraste o arquivo CSV aqui</p>
                <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <>
                {/* File info */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{fileName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {totalRows} leads
                    </Badge>
                    {totalRows > 500 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Máx 500
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCsvText(null);
                      setPreview([]);
                      setFileName("");
                      setTotalRows(0);
                    }}
                  >
                    Trocar
                  </Button>
                </div>

                {/* Preview */}
                {preview.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Preview (primeiras {preview.length} linhas)</Label>
                    <ScrollArea className="h-32 border rounded-lg">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left p-2">Nome</th>
                            <th className="text-left p-2">Cargo</th>
                            <th className="text-left p-2">Empresa</th>
                            <th className="text-left p-2">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="p-2 truncate max-w-[120px]">{row.name || "—"}</td>
                              <td className="p-2 truncate max-w-[120px]">{row.title || "—"}</td>
                              <td className="p-2 truncate max-w-[100px]">{row.company || "—"}</td>
                              <td className="p-2 truncate max-w-[140px]">{row.email || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                )}

                {/* Search target */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant={mode === "existing" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode("existing")}
                    >
                      Busca existente
                    </Button>
                    <Button
                      variant={mode === "new" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMode("new")}
                    >
                      Nova busca
                    </Button>
                  </div>

                  {mode === "existing" ? (
                    <div>
                      <Label className="text-sm">Vincular a busca</Label>
                      <Select value={selectedSearchId} onValueChange={setSelectedSearchId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione uma busca..." />
                        </SelectTrigger>
                        <SelectContent>
                          {searches.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.query}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm">Vaga</Label>
                        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione uma vaga..." />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map((j) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Nome da busca (opcional)</Label>
                        <Input
                          className="mt-1"
                          placeholder="Ex: Senior Backend - Sales Navigator"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={!csvText || isImporting || totalRows > 500}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {totalRows > 0 ? `${Math.min(totalRows, 500)} leads` : ""}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

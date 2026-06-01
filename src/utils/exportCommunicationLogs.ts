type CsvValue = string | number | boolean | null | undefined;

interface ExportSheet {
  name: string;
  headers: string[];
  rows: CsvValue[][];
}

function escapeCsvValue(value: CsvValue): string {
  const stringValue = value == null ? "" : String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function convertToCSV(headers: string[], rows: CsvValue[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function downloadCSV(content: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadAllAsZip(sheets: ExportSheet[], baseFilename: string): void {
  sheets.forEach((sheet, index) => {
    setTimeout(() => {
      const csv = convertToCSV(sheet.headers, sheet.rows);
      downloadCSV(csv, `${baseFilename}_${sheet.name}.csv`);
    }, index * 300);
  });
}

export interface CommunicationLogForExport {
  created_at: string;
  candidate_name?: string;
  job_title?: string;
  channel: string;
  status: string;
  message_type: string;
  recipient?: string | null;
  provider?: string | null;
  provider_message_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  metadata?: any;
}

export function exportCommunicationLogsMultiCSV(
  logs: CommunicationLogForExport[],
  baseFilename: string
) {
  const sheets: ExportSheet[] = [];

  // logs
  sheets.push({
    name: "logs",
    headers: [
      "created_at",
      "candidate",
      "job",
      "message_type",
      "channel",
      "status",
      "recipient",
      "provider",
      "provider_message_id",
      "error_code",
      "error_message",
      "reminder_day",
      "manual",
      "force",
      "opt_out_overridden",
    ],
    rows: logs.map((l) => {
      const meta = l.metadata || {};
      return [
        l.created_at,
        l.candidate_name || "",
        l.job_title || "",
        l.message_type,
        l.channel,
        l.status,
        l.recipient || "",
        l.provider || "",
        l.provider_message_id || "",
        l.error_code || "",
        l.error_message || "",
        meta?.reminder_day ?? "",
        Boolean(meta?.manual),
        Boolean(meta?.force),
        Boolean(meta?.opt_out_overridden),
      ];
    }),
  });

  // summary (by status/channel)
  const byKey = new Map<string, number>();
  for (const l of logs) {
    const key = `${l.channel}::${l.status}`;
    byKey.set(key, (byKey.get(key) || 0) + 1);
  }
  sheets.push({
    name: "summary",
    headers: ["channel", "status", "count"],
    rows: Array.from(byKey.entries()).map(([k, count]) => {
      const [channel, status] = k.split("::");
      return [channel, status, count];
    }),
  });

  // errors (top)
  const errors = new Map<string, number>();
  for (const l of logs) {
    if (l.status !== "failed") continue;
    const key = l.error_code || l.error_message || "unknown";
    errors.set(key, (errors.get(key) || 0) + 1);
  }
  const topErrors = Array.from(errors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
  sheets.push({
    name: "errors",
    headers: ["error", "count"],
    rows: topErrors.map(([err, count]) => [err, count]),
  });

  downloadAllAsZip(sheets, baseFilename);
}

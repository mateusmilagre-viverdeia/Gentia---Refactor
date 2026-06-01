import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BackupSummary {
  companies: number;
  profiles: number;
  totalRecords: number;
}

interface BackupData {
  exportDate: string;
  version: string;
  summary: BackupSummary;
  data: Record<string, unknown[]>;
}

export function useBackupExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");

  const tablesToExport = [
    "companies",
    "profiles",
    "account_members",
    "account_invites",
    "strategic_projects",
    "strategic_indicators",
    "mission_sessions",
    "mission_version_history",
    "vision_sessions",
    "vision_version_history",
    "values_sessions",
    "values_behaviors_selections",
    "values_version_history",
    "decision_sessions",
    "decision_answers",
    "decision_version_history",
    "ritual_sessions",
    "ritual_items",
    "ritual_version_history",
    "event_sessions",
    "event_items",
    "event_version_history",
    "energy_sessions",
    "energy_selections",
    "energy_version_history",
    "development_sessions",
    "development_selections",
    "development_version_history",
    "culture_code_sessions",
    "culture_code_version_history",
    "org_charts",
    "org_chart_nodes",
    "hiring_funnels",
    "hiring_funnel_stages",
    "job_descriptions",
    "people_analyses",
    "people_analysis_members",
    "people_analysis_ratings",
    "performance_assessments",
    "performance_assessment_points",
    "action_plans",
    "journey_progress",
    "notifications",
    "consultant_assignments",
    "consultant_notes",
    "project_checkpoints",
    "checkpoint_actions",
  ];

  const exportBackup = async (): Promise<BackupData | null> => {
    setIsExporting(true);
    setProgress(0);

    const data: Record<string, unknown[]> = {};
    let totalRecords = 0;

    try {
      for (let i = 0; i < tablesToExport.length; i++) {
        const tableName = tablesToExport[i];
        setCurrentTable(tableName);
        setProgress(Math.round((i / tablesToExport.length) * 100));

        const { data: tableData, error } = await supabase
          .from(tableName as any)
          .select("*");

        if (error) {
          console.warn(`Erro ao exportar ${tableName}:`, error.message);
          data[tableName] = [];
        } else {
          data[tableName] = tableData || [];
          totalRecords += tableData?.length || 0;
        }
      }

      setProgress(100);
      setCurrentTable("");

      const backup: BackupData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        summary: {
          companies: (data.companies as unknown[])?.length || 0,
          profiles: (data.profiles as unknown[])?.length || 0,
          totalRecords,
        },
        data,
      };

      return backup;
    } catch (error) {
      console.error("Erro durante exportação:", error);
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBackup = (backup: BackupData) => {
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
    const filename = `backup_cultura_${timestamp}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    isExporting,
    progress,
    currentTable,
    exportBackup,
    downloadBackup,
    tablesToExport,
  };
}

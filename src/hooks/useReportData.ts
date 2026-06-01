import type { DashboardPeriod } from "./useRecruitmentDashboard";
import { useFunnelAnalytics } from "./useFunnelAnalytics";
import { useTimeAnalytics } from "./useTimeAnalytics";
import { useSourceAnalytics } from "./useSourceAnalytics";
import { useJobAnalytics } from "./useJobAnalytics";
import { useEfficiencyMetrics } from "./useEfficiencyMetrics";
import { useOrganization } from "@/contexts/OrganizationContext";
import { subDays } from "date-fns";
import { formatBRT } from "@/lib/datetime";

export interface ReportData {
  funnel: ReturnType<typeof useFunnelAnalytics>["data"];
  time: ReturnType<typeof useTimeAnalytics>["data"];
  sources: ReturnType<typeof useSourceAnalytics>["data"];
  jobs: ReturnType<typeof useJobAnalytics>["data"];
  efficiency: ReturnType<typeof useEfficiencyMetrics>["data"];
  period: string;
  periodLabel: string;
  organizationName: string;
  generatedAt: string;
}

export function useReportData(period: DashboardPeriod) {
  const { currentAccount } = useOrganization();
  const { data: funnelData, isLoading: funnelLoading } = useFunnelAnalytics(period);
  const { data: timeData, isLoading: timeLoading } = useTimeAnalytics(period);
  const { data: sourceData, isLoading: sourceLoading } = useSourceAnalytics(period);
  const { data: jobData, isLoading: jobLoading } = useJobAnalytics(period);
  const { data: efficiencyData, isLoading: efficiencyLoading } = useEfficiencyMetrics(period);

  const isLoading = funnelLoading || timeLoading || sourceLoading || jobLoading || efficiencyLoading;

  const days = period === "7d" ? 7 : 30;
  const startDate = subDays(new Date(), days);
  const endDate = new Date();

  const periodLabel = period === "7d" ? "Últimos 7 dias" : "Últimos 30 dias";
  const periodRange = `${formatBRT(startDate, "dd/MM/yyyy")} - ${formatBRT(endDate, "dd/MM/yyyy")}`;

  const reportData: ReportData = {
    funnel: funnelData,
    time: timeData,
    sources: sourceData,
    jobs: jobData,
    efficiency: efficiencyData,
    period: periodRange,
    periodLabel,
    organizationName: currentAccount?.name || "Organização",
    generatedAt: formatBRT(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm"),
  };

  return {
    data: reportData,
    isLoading,
    isReady: !isLoading && !!funnelData && !!timeData,
  };
}

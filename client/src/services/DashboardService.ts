import AxiosInstance from "./AxiosInstance";

export type DashboardPeriod = "7d" | "30d" | "6m" | "12m";

export interface DashboardCard {
  key: string;
  label: string;
  value: number;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface DashboardChart {
  title: string;
  series: DashboardChartPoint[];
}

export interface DashboardItem {
  id?: number | string;
  type?: string;
  title?: string | null;
  status?: string | null;
  approval_stage?: string | null;
  detail?: string | null;
  start?: string | null;
  end?: string | null;
  occurred_at?: string | null;
}

export interface DashboardSection {
  title: string;
  items: DashboardItem[];
}

export interface DashboardPayload {
  role: string;
  role_label: string;
  period: DashboardPeriod;
  period_label: string;
  user: {
    full_name: string;
    office?: string | null;
  };
  capabilities: {
    events: boolean;
    vehicles: boolean;
    users: boolean;
    venues: boolean;
    drivers: boolean;
  };
  cards: DashboardCard[];
  charts: Record<string, DashboardChart>;
  sections: Record<string, DashboardSection>;
}

export interface DashboardResponse {
  message: string;
  data: DashboardPayload;
}

const DashboardService = {
  load: async (period: DashboardPeriod = "30d") => {
    return await AxiosInstance.get<DashboardResponse>("/dashboard", {
      params: { period },
    });
  },
};

export default DashboardService;

import AxiosInstance from "./AxiosInstance";

export interface AppNotification {
  notification_id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string | null;
}

const NotificationService = {
  list: () =>
    AxiosInstance.get<{
      unread_count: number;
      data: AppNotification[];
    }>("/notifications"),
  markRead: (id: number) =>
    AxiosInstance.post(`/notifications/${id}/read`),
  markAllRead: () => AxiosInstance.post("/notifications/read-all"),
};

export default NotificationService;

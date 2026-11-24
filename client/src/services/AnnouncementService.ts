import AxiosInstance from "./AxiosInstance";

export interface Announcement {
  announcement_id: number;
  title: string;
  body: string;
  author_name: string | null;
  author_role: string | null;
  created_at: string | null;
}

const AnnouncementService = {
  list: () =>
    AxiosInstance.get<{
      message: string;
      can_publish: boolean;
      data: Announcement[];
    }>("/announcements"),
  create: (payload: { title: string; body: string }) =>
    AxiosInstance.post<{ message: string; data: Announcement }>(
      "/announcements",
      payload,
    ),
  remove: (id: number) =>
    AxiosInstance.delete<{ message: string }>(`/announcements/${id}`),
};

export default AnnouncementService;

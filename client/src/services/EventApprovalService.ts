import type {
  ApiItem,
  ApiList,
  EventBooking,
} from "../interfaces/EventBookingFlow";
import AxiosInstance from "./AxiosInstance"; // adjust if your file name/folder differs

export const eventApprovalService = {
  /** Approvers: requests waiting on the logged-in approver. */
  async awaitingMyApproval(): Promise<EventBooking[]> {
    const res = await AxiosInstance.get<ApiList<EventBooking>>(
      "/event-bookings/awaiting-my-approval",
    );
    return res.data.data;
  },

  /** Requesters (faculty/staff, students): their own requests, scoped by the backend. */
  async myRequests(): Promise<EventBooking[]> {
    const res =
      await AxiosInstance.get<ApiList<EventBooking>>("/event-bookings");
    return res.data.data;
  },

  async approve(id: number, remarks?: string): Promise<ApiItem<EventBooking>> {
    const res = await AxiosInstance.put<ApiItem<EventBooking>>(
      `/event-bookings/updateStatus/${id}`,
      { status: "approved", approval_remarks: remarks?.trim() || null },
    );
    return res.data;
  },

  async reject(id: number, remarks: string): Promise<ApiItem<EventBooking>> {
    const res = await AxiosInstance.put<ApiItem<EventBooking>>(
      `/event-bookings/updateStatus/${id}`,
      { status: "rejected", approval_remarks: remarks.trim() },
    );
    return res.data;
  },
};

/** Pulls the first Laravel validation/auth message out of an axios error. */
export function apiErrorMessage(error: unknown): string {
  const e = error as {
    response?: {
      data?: { message?: string; errors?: Record<string, string[]> };
    };
  };
  const errors = e.response?.data?.errors;
  if (errors) {
    const first = Object.values(errors)[0]?.[0];
    if (first) return first;
  }
  return e.response?.data?.message ?? "Something went wrong. Please try again.";
}

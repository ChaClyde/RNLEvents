import AxiosInstance from "./AxiosInstance";

export interface SignatureStatus {
  has_signature: boolean;
  mime_type: string | null;
  updated_at?: string | null;
}

const SignatureService = {
  show: async () => {
    return await AxiosInstance.get<{ message: string; data: SignatureStatus }>(
      "/account/signature",
    );
  },

  image: async () => {
    return await AxiosInstance.get<Blob>("/account/signature/image", {
      responseType: "blob",
    });
  },

  save: async (file: File) => {
    const body = new FormData();
    body.append("signature", file);

    return await AxiosInstance.post<{ message: string; data: SignatureStatus }>(
      "/account/signature",
      body,
    );
  },

  remove: async () => {
    return await AxiosInstance.delete<{ message: string; data: SignatureStatus }>(
      "/account/signature",
    );
  },

  approvalImage: async (eventBookingId: number, approvalId: number) => {
    return await AxiosInstance.get<Blob>(
      `/event-bookings/${eventBookingId}/approvals/${approvalId}/signature`,
      { responseType: "blob" },
    );
  },
};

export default SignatureService;

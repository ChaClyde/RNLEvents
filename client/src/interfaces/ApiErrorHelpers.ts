import { isAxiosError } from "axios";

export interface ParsedApiErrors<T extends object = Record<string, string[]>> {
  status?: number;
  message: string;
  fieldErrors: T;
}

export const parseApiErrors = <T extends object = Record<string, string[]>>(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedApiErrors<T> => {
  if (isAxiosError(error)) {
    if (!error.response) {
      return {
        message: "Unable to reach the server. Please check your connection.",
        fieldErrors: {} as T,
      };
    }

    const data = error.response.data as
      | { message?: string; errors?: T }
      | undefined;

    return {
      status: error.response.status,
      message: data?.message ?? fallback,
      fieldErrors: data?.errors ?? ({} as T),
    };
  }

  return { message: fallback, fieldErrors: {} as T };
};

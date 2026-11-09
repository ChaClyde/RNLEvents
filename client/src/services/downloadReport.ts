import type { AxiosResponse } from "axios";

const filenameFromDisposition = (
  disposition: string | undefined,
  fallback: string,
) => {
  if (!disposition) {
    return fallback;
  }

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
};

export const downloadReportResponse = async (
  response: AxiosResponse<Blob>,
  fallbackName: string,
) => {
  const type = String(response.headers["content-type"] ?? response.data.type ?? "");

  if (type.includes("application/json")) {
    const text = await response.data.text();
    const parsed = JSON.parse(text) as { message?: string };
    throw new Error(parsed.message || "Unable to export the report.");
  }

  const filename = filenameFromDisposition(
    response.headers["content-disposition"],
    fallbackName,
  );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

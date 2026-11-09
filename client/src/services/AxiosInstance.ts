import axios from "axios";

const backendOrigin = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  "",
);

const AxiosInstance = axios.create({
  baseURL: backendOrigin ? `${backendOrigin}/api` : "/api",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

const isAuthHandshake = (url?: string) => {
  if (!url) {
    return false;
  }

  return (
    url.includes("/auth/login") ||
    url.includes("/auth/me") ||
    url.includes("/sanctum/csrf-cookie")
  );
};

AxiosInstance.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (config.data !== undefined && config.method !== "get") {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

AxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? "");

    if (status === 401 && !isAuthHandshake(url) && !handlingUnauthorized) {
      handlingUnauthorized = true;
      unauthorizedHandler?.();
      handlingUnauthorized = false;
    }

    if (status !== 401 && status !== 403 && status !== 422) {
      console.error("Unexpected response error: ", error);
    }

    return Promise.reject(error);
  },
);

export { backendOrigin };
export default AxiosInstance;

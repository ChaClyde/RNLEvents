import AxiosInstance, { backendOrigin } from "./AxiosInstance";

export interface LoginPayload {
  login: string;
  password: string;
}

export const AuthService = {
  csrf: () =>
    AxiosInstance.get(`${backendOrigin}/sanctum/csrf-cookie`, {
      baseURL: "",
    }),

  login: (payload: LoginPayload) =>
    AxiosInstance.post("/auth/login", payload),

  logout: () => AxiosInstance.post("/auth/logout"),

  me: () => AxiosInstance.get("/auth/me"),
};

export default AuthService;

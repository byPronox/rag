import axios, { AxiosError } from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { "Content-Type": "application/json", "X-System": "B" },
});

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:unauthorized"));
        }
        return Promise.reject(error);
    }
);
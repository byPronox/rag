import { api, API_BASE } from "./client";

export function startLogin(returnTo = "/dashboard"): void {
    const fullReturn = encodeURIComponent(`${window.location.origin}${returnTo}`);
    const url = `${API_BASE}/auth/login?origin=B&return_to=${fullReturn}`;
    window.location.assign(url);
}

export async function fetchSession() {
    const { data } = await api.get("/auth/session");
    return data;
}

export async function logout() {
    const returnTo = encodeURIComponent(window.location.origin);
    const { data } = await api.post(`/auth/logout?origin=B&return_to=${returnTo}`);
    return data; // { logoutUrl }
}
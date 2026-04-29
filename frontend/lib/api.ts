// API Configuration for RAG Intelligence Backend (Railway)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Auth endpoints
export const AUTH_ENDPOINTS = {
  register: `${API_BASE_URL}/auth/register`,
  login: `${API_BASE_URL}/auth/login`,
}

// RAG endpoints
export const RAG_ENDPOINTS = {
  search: `${API_BASE_URL}/api/v1/search/`,
  chat: `${API_BASE_URL}/api/v1/chat/`,
}

// API helper functions
export async function apiPost<T>(url: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }

  return response.json()
}

export async function apiPostFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }

  return response.json()
}

// Auth functions
export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  message: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const formData = new FormData()
  formData.append("username", email)
  formData.append("password", password)
  
  return apiPostFormData<LoginResponse>(AUTH_ENDPOINTS.login, formData)
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>(AUTH_ENDPOINTS.register, { email, password })
}

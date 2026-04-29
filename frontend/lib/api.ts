// API Configuration for Core & RAG Microservices

// 1. Apunta al Microservicio 2 (Core)
const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8000"

// 2. Apunta al Microservicio 3 (RAG / Chatbot)
const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"

// Auth endpoints -> Usan el Core API (Microservicio 2)
export const AUTH_ENDPOINTS = {
  register: `${CORE_API_URL}/api/v1/auth/register`,
  login: `${CORE_API_URL}/api/v1/auth/login`,
}

// RAG endpoints -> Usan el RAG API (Microservicio 3)
export const RAG_ENDPOINTS = {
  search: `${RAG_API_URL}/api/v1/search/`,
  chat: `${RAG_API_URL}/api/v1/chat/`,
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
  
  // Automáticamente usará CORE_API_URL
  return apiPostFormData<LoginResponse>(AUTH_ENDPOINTS.login, formData)
}

export async function register(email: string, password: string): Promise<RegisterResponse> {
  // Automáticamente usará CORE_API_URL
  return apiPost<RegisterResponse>(AUTH_ENDPOINTS.register, { email, password })
}
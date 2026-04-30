// API Configuration for Core & RAG Microservices
import type { User } from "./auth-context"

// 1. Apunta al Microservicio 2 (Core)
const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8000"

// 2. Apunta al Microservicio 3 (RAG / Chatbot)
const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || "http://localhost:8001"

// Auth endpoints -> Usan el Core API (Microservicio 2)
export const AUTH_ENDPOINTS = {
  register: `${CORE_API_URL}/api/v1/auth/register`,
  login: `${CORE_API_URL}/api/v1/auth/login`,
  me: `${CORE_API_URL}/api/v1/auth/me`,
}

// Admin endpoints -> Usan el Core API (Microservicio 2)
export const ADMIN_ENDPOINTS = {
  users: `${CORE_API_URL}/api/v1/admin/users`,
  models: `${CORE_API_URL}/api/v1/admin/models`,
  metrics: `${CORE_API_URL}/api/v1/admin/metrics`,
}

// User endpoints -> Usan el Core API (Microservicio 2)
export const USER_ENDPOINTS = {
  config: `${CORE_API_URL}/api/v1/user/config`,
  metrics: `${CORE_API_URL}/api/v1/user/metrics`,
  chatHistory: `${CORE_API_URL}/api/v1/user/chat-history`,
  searchHistory: `${CORE_API_URL}/api/v1/user/search-history`,
}

// RAG endpoints -> Usan el RAG API (Microservicio 3)
export const RAG_ENDPOINTS = {
  search: `${RAG_API_URL}/api/v1/search/`,
  chat: `${RAG_API_URL}/api/v1/chat/`,
}

// Get auth headers helper
export function getAuthHeaders(token: string): HeadersInit {
  return {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

// API helper functions
export async function apiPost<T>(url: string, data: Record<string, unknown>, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }

  return response.json()
}

export async function apiGet<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }

  return response.json()
}

export async function apiPut<T>(url: string, data: Record<string, unknown>, token?: string): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }

  return response.json()
}

export async function apiDelete<T>(url: string, token?: string): Promise<T> {
  const headers: HeadersInit = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method: "DELETE",
    headers,
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
  user: User
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

// Admin API functions
export async function getUsers(token: string): Promise<User[]> {
  return apiGet<User[]>(ADMIN_ENDPOINTS.users, token)
}

export async function createUser(token: string, userData: { email: string; password: string; role: string }): Promise<User> {
  return apiPost<User>(ADMIN_ENDPOINTS.users, userData, token)
}

export async function updateUser(token: string, userId: number, userData: Partial<User>): Promise<User> {
  return apiPut<User>(`${ADMIN_ENDPOINTS.users}/${userId}`, userData as Record<string, unknown>, token)
}

export async function deleteUser(token: string, userId: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`${ADMIN_ENDPOINTS.users}/${userId}`, token)
}

// Models
export interface AIModel {
  id: string
  name: string
  type: "llm" | "embedding"
  provider: string
  is_active: boolean
}

export async function getModels(token: string): Promise<AIModel[]> {
  return apiGet<AIModel[]>(ADMIN_ENDPOINTS.models, token)
}

export async function updateModel(token: string, modelId: string, data: Partial<AIModel>): Promise<AIModel> {
  return apiPut<AIModel>(`${ADMIN_ENDPOINTS.models}/${modelId}`, data as Record<string, unknown>, token)
}

// Metrics
export interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  totalQueries: number
  totalTokens: number
  avgResponseTime: number
}

export async function getAdminMetrics(token: string): Promise<AdminMetrics> {
  return apiGet<AdminMetrics>(ADMIN_ENDPOINTS.metrics, token)
}

// User-specific functions
export interface UserConfig {
  id: number
  user_id: number
  system_api_key: string
  selected_embedding_model: string
  selected_llm_model: string
  welcome_message: string
  system_prompt: string
  is_active: boolean
}

export async function getUserConfig(token: string): Promise<UserConfig> {
  return apiGet<UserConfig>(USER_ENDPOINTS.config, token)
}

export async function updateUserConfig(token: string, config: Partial<UserConfig>): Promise<UserConfig> {
  return apiPut<UserConfig>(USER_ENDPOINTS.config, config as Record<string, unknown>, token)
}

export interface ChatMessage {
  id: number
  session_id: string
  role: string
  message: string
  created_at: string
}

export async function getChatHistory(token: string): Promise<ChatMessage[]> {
  return apiGet<ChatMessage[]>(USER_ENDPOINTS.chatHistory, token)
}

export interface SearchQuery {
  id: number
  query_text: string
  created_at: string
}

export async function getSearchHistory(token: string): Promise<SearchQuery[]> {
  return apiGet<SearchQuery[]>(USER_ENDPOINTS.searchHistory, token)
}

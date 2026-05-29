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
  settings: `${CORE_API_URL}/api/v1/admin/settings`, // <--- AÑADE ESTA LÍNEA
}

// User endpoints -> Usan el Core API (Microservicio 2)
export const USER_ENDPOINTS = {
  companies: `${CORE_API_URL}/api/v1/user/companies`,
  config: `${CORE_API_URL}/api/v1/user/config`,
  models: `${CORE_API_URL}/api/v1/user/models`,
  products: `${CORE_API_URL}/api/v1/user/products`,
  dashboardMetrics: `${CORE_API_URL}/api/v1/user/dashboard-metrics`,
  metrics: `${CORE_API_URL}/api/v1/user/metrics`,
  chatHistory: `${CORE_API_URL}/api/v1/user/history/chat`,
  searchHistory: `${CORE_API_URL}/api/v1/user/history/search`,
}

// RAG endpoints -> Usan el RAG API (Microservicio 3)
export const RAG_ENDPOINTS = {
  search: `${RAG_API_URL}/api/v1/search/`,
  chat: `${RAG_API_URL}/api/v1/chat/`,
}

// ==========================================
// API HELPER FUNCTIONS (Con Cookies Habilitadas)
// ==========================================

export async function apiPost<T>(url: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }
  return response.json()
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }
  return response.json()
}

export async function apiPut<T>(url: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }
  return response.json()
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Error de conexión" }))
    throw new Error(error.detail || "Error en la solicitud")
  }
  return response.json()
}

// ==========================================
// AUTH FUNCTIONS
// ==========================================

export interface LoginResponse {
  message: string
  user: User
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

// ==========================================
// ADMIN API FUNCTIONS
// ==========================================

export async function getUsers(): Promise<User[]> {
  return apiGet<User[]>(ADMIN_ENDPOINTS.users)
}

export async function createUser(userData: { email: string; password: string; role: string }): Promise<User> {
  return apiPost<User>(ADMIN_ENDPOINTS.users, userData)
}

export async function updateUser(userId: number, userData: Partial<User>): Promise<User> {
  return apiPut<User>(`${ADMIN_ENDPOINTS.users}/${userId}`, userData as Record<string, unknown>)
}

export async function deleteUser(userId: number): Promise<{ message: string }> {
  return apiDelete<{ message: string }>(`${ADMIN_ENDPOINTS.users}/${userId}`)
}

// Models
export interface AIModel {
  id: string
  name: string
  type: "llm" | "embedding"
  provider: string
  is_active: boolean
}

export async function getModels(isAdmin: boolean = false): Promise<AIModel[]> {
  const url = isAdmin ? ADMIN_ENDPOINTS.models : USER_ENDPOINTS.models;
  return apiGet<AIModel[]>(url);
}

export async function updateModel(modelId: string, data: Partial<AIModel>): Promise<AIModel> {
  return apiPut<AIModel>(`${ADMIN_ENDPOINTS.models}/${modelId}`, data as Record<string, unknown>)
}

export async function syncModels(): Promise<{ message: string }> {
  // Usamos apiPost que ya maneja las cookies, y concatenamos /sync a tu endpoint de modelos
  return apiPost<{ message: string }>(`${ADMIN_ENDPOINTS.models}/sync`, {})
}

// ==========================================
// ADMIN METRICS (Datos Reales)
// ==========================================

export interface TopQuery {
  query: string
  hits: number
  relevance: number
}

export interface UserActivity {
  email: string
  queries: number
  tokens: number
}

export interface SystemMetrics {
  total_rag_queries: number
  total_search_queries: number
  total_tokens: number
  avg_latency_sec: number
  top_queries: TopQuery[]
  user_activity: UserActivity[]
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  return apiGet<SystemMetrics>(ADMIN_ENDPOINTS.metrics)
}

// ==========================================
// ADMIN SETTINGS (Configuraciones Globales)
// ==========================================

export interface GlobalSettings {
  default_llm_model: string
  default_embedding_model: string
  default_welcome_message: string
  default_system_prompt: string
  supreme_system_prompt: string
  groq_api_key?: string
  maintenance_mode: boolean
}

export async function getAdminSettings(): Promise<GlobalSettings> {
  return apiGet<GlobalSettings>(ADMIN_ENDPOINTS.settings)
}

export async function updateAdminSettings(data: Partial<GlobalSettings>): Promise<{ message: string }> {
  return apiPut<{ message: string }>(ADMIN_ENDPOINTS.settings, data as Record<string, unknown>)
}

export async function regenerateUserApiKey(userId: number): Promise<{ message: string, api_key: string }> {
  return apiPost<{ message: string, api_key: string }>(`${ADMIN_ENDPOINTS.users}/${userId}/api-key`, {})
}
// ==========================================
// USER & COMPANY-SPECIFIC FUNCTIONS
// ==========================================

export interface Company {
  platform: string
  company_id: string
  name: string
}

export interface CompanyConfig {
  id: number
  company_id: string
  selected_embedding_model: string
  selected_llm_model: string
  welcome_message: string
  system_prompt: string
  theme_color: string
  chat_icon: string
  is_active: boolean
}

// NUEVO: Obtener la lista de compañías a las que tiene acceso el inquilino
export async function getUserCompanies(): Promise<Company[]> {
  return apiGet<Company[]>(USER_ENDPOINTS.companies)
}

// ACTUALIZADO: Pide la configuración de una compañía específica
export async function getCompanyConfig(companyId: string): Promise<CompanyConfig> {
  return apiGet<CompanyConfig>(`${USER_ENDPOINTS.config}/${companyId}`)
}

// ACTUALIZADO: Actualiza la configuración de una compañía específica
export async function updateCompanyConfig(companyId: string, config: Partial<CompanyConfig>): Promise<{message: string}> {
  return apiPut<{message: string}>(`${USER_ENDPOINTS.config}/${companyId}`, config as Record<string, unknown>)
}

// NUEVO: Obtener los productos exportados para una compañía
export interface ProductItem {
  variant_id: number;
  sku: string;
  name: string;
  description?: string;
  price_excluded: number;
  price_included: number;
  stock: number;
  category: string;
  website_url?: string;
  image_128_url?: string;
  image_512_url?: string;
  company_id: string;
}

export async function getCompanyProducts(companyId: string): Promise<ProductItem[]> {
  return apiGet<ProductItem[]>(`${USER_ENDPOINTS.products}/${companyId}`)
}

export interface ActivityItem {
  type: string;
  detail: string;
  time: string;
  status: string;
}

export interface DashboardMetrics {
  total_products: number;
  total_chats: number;
  total_searches: number;
  tokens_used: number;
  recent_activity: ActivityItem[];
}

export async function getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
  return apiGet<DashboardMetrics>(`${USER_ENDPOINTS.dashboardMetrics}/${companyId}`)
}

// Historiales (Estos también requerirán filtrar por company_id en el backend más adelante, 
// pero por ahora mantenemos las interfaces como están para que no se rompan tus tablas)
export interface ChatMessage {
  id: number
  session_id: string
  role: string
  message: string
  tokens_used?: number
  latency_ms?: number
  created_at: string
}

export async function getChatHistory(companyId: string): Promise<ChatMessage[]> {
  return apiGet<ChatMessage[]>(`${USER_ENDPOINTS.chatHistory}/${companyId}`)
}

export interface SearchQuery {
  id: number
  session_id?: string
  query_text: string
  created_at: string
}

export async function getSearchHistory(companyId: string): Promise<SearchQuery[]> {
  return apiGet<SearchQuery[]>(`${USER_ENDPOINTS.searchHistory}/${companyId}`)
}

// ==========================================
// RAG SEMANTIC SEARCH widget
// ==========================================

export interface SearchResult {
  variant_id: number;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image_url?: string;
}

export async function testSemanticSearch(query: string, companyId: string, apiKey: string): Promise<SearchResult[]> {
  const url = `${RAG_ENDPOINTS.search}`;
  
  if (!apiKey) throw new Error("API Key faltante en la búsqueda");

  const response = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({ query: query, company_id: companyId }),
  });

  if (!response.ok) {
    throw new Error("Error en la búsqueda semántica");
  }
  
  const data = await response.json();
  return data.results;
}

export async function getUserApiKey(): Promise<{ message: string, api_key: string }> {
  return apiGet<{ message: string, api_key: string }>(`${CORE_API_URL}/api/v1/api-keys/`); 
}

// ==========================================
// RAG CHAT web demo
// ==========================================

export interface ChatMessagePayload {
  message: string;
  session_id: string;
  company_id: string;
}

export interface RagChatResponse {
  reply?: string;
  answer?: string;
}

export async function sendRagMessage(payload: ChatMessagePayload, apiKey: string): Promise<RagChatResponse> {
  // Usamos tu RAG_ENDPOINTS.chat centralizado
  const response = await fetch(RAG_ENDPOINTS.chat, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey 
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Error en la comunicación con el modelo RAG");
  }
  
  return response.json();
}
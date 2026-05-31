import type {
  AgentDetail, AgentSummary, AuthUser, ChatResponse, ColumnEnrichment,
  ConnectResponse, FinalizeRequest, RelationshipInfo,
  SchemaResponse, TableEnrichment, TokenResponse, UpdateAgentRequest,
} from './types'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signup = (email: string, password: string) =>
  request<TokenResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const login = (email: string, password: string) =>
  request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const getMe = () => request<AuthUser>('/auth/me')

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export const connectDb = (dbType: string, dbUri: string) =>
  request<ConnectResponse>('/onboarding/connect', {
    method: 'POST',
    body: JSON.stringify({ db_type: dbType, db_uri: dbUri }),
  })

export const getSchema = (draftId: string) =>
  request<SchemaResponse>(`/onboarding/${draftId}/schema`)

export const setRelationships = (draftId: string, relationships: RelationshipInfo[]) =>
  request(`/onboarding/${draftId}/relationships`, {
    method: 'PUT',
    body: JSON.stringify({ relationships }),
  })

export const enrichSchema = (
  draftId: string,
  tables: TableEnrichment[],
  columns: ColumnEnrichment[],
) =>
  request(`/onboarding/${draftId}/enrich`, {
    method: 'PUT',
    body: JSON.stringify({ tables, columns }),
  })

export const finalizeAgent = (draftId: string, data: FinalizeRequest) =>
  request<AgentSummary>(`/onboarding/${draftId}/finalize`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export const listAgents = () => request<AgentSummary[]>('/agents')
export const getAgent  = (id: string) => request<AgentSummary>(`/agents/${id}`)
export const getAgentSchema = (id: string) => request<SchemaResponse>(`/agents/${id}/schema`)
export const getAgentDetail = (id: string) => request<AgentDetail>(`/agents/${id}/detail`)
export const updateAgent = (id: string, data: UpdateAgentRequest) =>
  request<AgentSummary>(`/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
export const deleteAgent = (id: string) =>
  request(`/agents/${id}`, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const sendMessage = (agentId: string, message: string, userId?: string) =>
  request<ChatResponse>(`/agents/${agentId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, user_id: userId ?? null }),
  })

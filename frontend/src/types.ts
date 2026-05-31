export type DbType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'
export type ScopeMode = 'user_scoped' | 'full_db'
export type AccessMode = 'private' | 'public' | 'link_only' | 'restricted'
export type RelationshipType = 'one_to_one' | 'one_to_many' | 'many_to_many'

export interface ColumnInfo {
  name: string
  db_type: string
  nullable: boolean
  is_primary_key: boolean
  is_foreign_key: boolean
  label: string | null
  description: string | null
  example_values: string[]
}

export interface TableInfo {
  name: string
  label: string | null
  description: string | null
  columns: ColumnInfo[]
  estimated_row_count: number | null
}

export interface RelationshipInfo {
  from_table: string
  from_column: string
  to_table: string
  to_column: string
  relationship_type: RelationshipType
  description: string | null
}

export interface SchemaResponse {
  draft_id: string
  tables: TableInfo[]
  relationships: RelationshipInfo[]
}

export interface ConnectResponse {
  draft_id: string
  db_type: DbType
  tables_found: number
  message: string
}

export interface AgentSummary {
  agent_id: string
  name: string
  description: string
  db_type: DbType
  scope_mode: ScopeMode
  access_mode: AccessMode
  owner_id: string | null
  table_count: number
  status: string
  created_at: string
}

export interface AuthUser {
  user_id: string
  email: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface QueryResult {
  columns: string[]
  rows: (string | number | boolean | null)[][]
  row_count: number
}

export interface ChatResponse {
  answer: string
  generated_query: string | null
  results: QueryResult | null
  error: string | null
}

export interface TableEnrichment {
  table_name: string
  label?: string
  description?: string
}

export interface ColumnEnrichment {
  table_name: string
  column_name: string
  label?: string
  description?: string
}

export interface AgentDetail {
  name: string
  description: string
  global_prompt: string
  scope_mode: ScopeMode
  user_id_column: string | null
  access_mode: AccessMode
  allowed_users: string[]
}

export interface UpdateAgentRequest {
  name: string
  description: string
  global_prompt: string
  scope_mode: ScopeMode
  user_id_column: string | null
  access_mode: AccessMode
  allowed_users: string[]
}

export interface FinalizeRequest {
  name: string
  description: string
  global_prompt: string
  scope_mode: ScopeMode
  user_id_column: string | null
  access_mode: AccessMode
  allowed_users: string[]
}

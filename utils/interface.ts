export interface User {
  id: string
  username: string | null
  email?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export interface AuthUser extends User {
  name: string
  email: string
  image: string | null
}

export interface AuthContextValue {
  account: AuthUser | null
  loading: boolean
  signingIn: boolean
  error: Error | null
  authenticated: boolean
  refresh: () => Promise<AuthUser | null>
  login: (returnTo?: string) => void
  register: (returnTo?: string) => void
  logout: (returnTo?: string) => Promise<void>
}

export interface AuthMeResponse {
  user?: AuthUser | null
  gorth_app?: Record<string, unknown>
  error?: string
}

export interface ApiAuthContext {
  authenticated: true
  verifiedBy: "better-auth" | "single-sign-on"
  user: {
    id: string
    email: string
    name: string | null
    username: string | null
    image: string | null
    status: "active" | "inactive" | "suspended" | "deleted"
  }
  app: Record<string, unknown> | null
  scopes: string[]
  sessionId: string | null
  localRole: string | null
}

export interface ApiEnv {
  Variables: { auth: ApiAuthContext; appCredentials?: { accessToken: string } }
}

export interface AppSessionCredentials {
  id: string
  subject: string
  sid: string
  createdAt: number
  expiresAt: number
  user: Pick<
    import("@/database/schema").UserRow,
    | "id"
    | "externalUserId"
    | "name"
    | "email"
    | "username"
    | "image"
    | "status"
    | "role"
    | "bannedAt"
    | "banExpires"
    | "deletedAt"
  >
  credentials: { accessToken: string }
}

export type AuthUserStatus = import("@/database/schema").UserRow["status"]

export interface SsoAuthUserClaims extends Record<string, unknown> {
  sub?: string
  email?: string
  name?: string | null
  preferred_username?: string | null
  status?: AuthUserStatus
  picture?: string | null
  user_metadata?: Record<string, unknown>
  gorth_app?: Record<string, unknown>
}

export interface SsoAuthUser {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  status: AuthUserStatus
}

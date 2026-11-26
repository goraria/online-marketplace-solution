import "server-only"

import type { NextRequest } from "next/server"

import { serverUrl, ssoServerUrl } from "@/utils/environment"
import {
  fetcher,
  toWebResponse,
  type FetcherOptions,
} from "@/utils/fetcher"

function getSsoServerBaseUrl() {
  if (!ssoServerUrl) throw new Error("missing_sso_server_url")
  return ssoServerUrl
}

function getAppServerBaseUrl() {
  if (!serverUrl) throw new Error("missing_app_server_url")
  return serverUrl
}

export function getRouteOpenIdConfiguration<TData>(issuer: string) {
  return fetcher<TData>({
    url: `${issuer}/.well-known/openid-configuration`,
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function getRouteJwks<TData>(jwksUri: string) {
  return fetcher<TData>({
    url: jwksUri,
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function exchangeRouteAuthorizationCode<TData>(body: URLSearchParams) {
  return fetcher<TData, URLSearchParams>({
    url: new URL("/auth/oauth2/token", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function syncRouteAppUser(accessToken: string) {
  return fetcher({
    url: new URL("/auth/sync-user", getAppServerBaseUrl()),
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function getRouteOAuthUserInfo<TData>(accessToken: string) {
  return fetcher<TData>({
    url: new URL("/auth/oauth2/userinfo", getSsoServerBaseUrl()),
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function refreshRouteOAuthToken<TData>(body: URLSearchParams) {
  return fetcher<TData, URLSearchParams>({
    url: new URL("/auth/oauth2/token", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export function revokeRouteOAuthToken(body: URLSearchParams) {
  return fetcher({
    url: new URL("/auth/oauth2/revoke", getSsoServerBaseUrl()),
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    cache: "no-store",
    validateStatus: () => true,
  })
}

export async function forwardRouteRequest(options: {
  url: URL
  method: string
  headers: Headers
  body?: ArrayBuffer
}) {
  const response = await fetcher<ArrayBuffer, ArrayBuffer | undefined>({
    url: options.url,
    method: options.method as FetcherOptions["method"],
    headers: Object.fromEntries(options.headers),
    body: options.body,
    redirect: "manual",
    cache: "no-store",
    responseType: "arraybuffer",
    validateStatus: () => true,
  })

  return toWebResponse(response)
}

const platformBodyMethods = new Set(["POST", "PUT", "PATCH", "DELETE"])
const platformForwardedHeaders = [
  "accept",
  "content-type",
  "if-match",
  "if-none-match",
  "idempotency-key",
  "x-request-id",
] as const

export async function forwardPlatformRouteRequest(options: {
  request: NextRequest
  baseUrl: string
  domain: "payment" | "billing"
  path?: string[]
  accessToken?: string
  allowAnonymous?: boolean
}) {
  const {
    request,
    baseUrl,
    domain,
    path = [],
    accessToken,
    allowAnonymous,
  } = options
  const hasBody = platformBodyMethods.has(request.method)
  const origin = request.headers.get("origin")

  if (hasBody && origin && origin !== request.nextUrl.origin) {
    return Response.json({ error: "invalid_origin" }, { status: 403 })
  }
  if (!accessToken && !allowAnonymous) {
    return Response.json({ error: "missing_access_token" }, { status: 401 })
  }
  if (!baseUrl) {
    return Response.json(
      { error: `missing_${domain}_server_url` },
      { status: 500 }
    )
  }

  const suffix = path.length
    ? `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`
    : ""
  const target = new URL(`/${domain}${suffix}`, baseUrl)
  target.search = request.nextUrl.search

  const headers = new Headers()
  for (const name of platformForwardedHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`)

  return forwardRouteRequest({
    url: target,
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
  })
}

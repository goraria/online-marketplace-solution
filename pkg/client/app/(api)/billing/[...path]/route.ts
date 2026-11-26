import type { NextRequest } from "next/server"

import {
  accessTokenCookie,
  billingSubscriptionServerUrl,
} from "@/utils/environment"
import { forwardPlatformRouteRequest } from "@/services/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

async function proxyBillingRequest(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params
  const allowAnonymous = request.method === "GET" && path[0] === "catalog"
  return forwardPlatformRouteRequest({
    request,
    baseUrl: billingSubscriptionServerUrl,
    domain: "billing",
    path,
    accessToken: request.cookies.get(accessTokenCookie)?.value,
    allowAnonymous,
  })
}

export const GET = proxyBillingRequest
export const POST = proxyBillingRequest

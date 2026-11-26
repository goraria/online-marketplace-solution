import type { NextRequest } from "next/server"

import {
  accessTokenCookie,
  paymentGatewayServerUrl,
} from "@/utils/environment"
import { forwardPlatformRouteRequest } from "@/services/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

async function proxyPaymentRequest(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params
  if (path[0] === "webhook" || path[0] === "return") {
    return Response.json({ error: "not_found" }, { status: 404 })
  }
  return forwardPlatformRouteRequest({
    request,
    baseUrl: paymentGatewayServerUrl,
    domain: "payment",
    path,
    accessToken: request.cookies.get(accessTokenCookie)?.value,
  })
}

export const GET = proxyPaymentRequest
export const POST = proxyPaymentRequest

import type { NextRequest } from "next/server"

import {
  accessTokenCookie,
  paymentGatewayServerUrl,
} from "@/utils/environment"
import { forwardPlatformRouteRequest } from "@/services/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export function GET(request: NextRequest) {
  return forwardPlatformRouteRequest({
    request,
    baseUrl: paymentGatewayServerUrl,
    domain: "payment",
    accessToken: request.cookies.get(accessTokenCookie)?.value,
  })
}

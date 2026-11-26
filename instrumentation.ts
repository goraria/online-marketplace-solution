import { registerVercelTelemetry } from "@gorth-com/principle/configs/vercel"
import { vercelTelemetryEnabled } from "@/utils/environment"

export function register() {
  registerVercelTelemetry("online-marketplace-solution", vercelTelemetryEnabled)
}

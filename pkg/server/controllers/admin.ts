import { ZodError } from "@gorth/structure/cores/zod"

import type { NextFunction, Request, Response } from "@/lib/http"
import { listAdminResource as listAdminResourceServices } from "@/services/admin"

export async function listAdminResource(request: Request, response: Response, next: NextFunction) {
  try {
    return response.status(200).json(await listAdminResourceServices(request.params.resource, request.query))
  } catch (error) {
    if (error instanceof ZodError) {
      return response.status(422).json({ error: "validation_failed", issues: error.issues })
    }
    return next(error)
  }
}

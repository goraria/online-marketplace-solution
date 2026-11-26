import { ZodError } from "@gorth/structure/cores/zod"

import type { NextFunction, Request, Response } from "@/lib/http"
import { MarketplaceError } from "@/lib/marketplace-error"
import type { AuthContext } from "@/middlewares/auth"
import {
  createSellerProduct as createSellerProductServices,
  getSellerContext as getSellerContextServices,
  listSellerProduct as listSellerProductServices,
} from "@/services/seller"

export async function getSellerContext(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const actor = (response.locals.auth as AuthContext).user.id
    return response.status(200).json({ data: await getSellerContextServices(actor) })
  } catch (error) {
    if (error instanceof MarketplaceError) return response.status(error.status).json({ error: error.code })
    return next(error)
  }
}

export async function listSellerProduct(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const actor = (response.locals.auth as AuthContext).user.id
    return response.status(200).json(await listSellerProductServices(actor, request.query))
  } catch (error) {
    if (error instanceof ZodError) return response.status(422).json({ error: "validation_failed", issues: error.issues })
    if (error instanceof MarketplaceError) return response.status(error.status).json({ error: error.code })
    return next(error)
  }
}

export async function createSellerProduct(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const actor = (response.locals.auth as AuthContext).user.id
    const product = await createSellerProductServices(actor, request.body, request.get("authorization"))
    return response.status(201).json({ data: product })
  } catch (error) {
    if (error instanceof ZodError) return response.status(422).json({ error: "validation_failed", issues: error.issues })
    if (error instanceof MarketplaceError) return response.status(error.status).json({ error: error.code })
    return next(error)
  }
}

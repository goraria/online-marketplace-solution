import { ZodError } from "@gorth/structure/cores/zod"

import type { NextFunction, Request, Response } from "@/lib/http"
import { MarketplaceError } from "@/lib/marketplace-error"
import type { AuthContext } from "@/middlewares/auth"
import * as CatalogServices from "@/services/catalog"
import * as CommerceServices from "@/services/commerce"

function sendError(error: unknown, response: Response, next: NextFunction) {
  if (error instanceof MarketplaceError) {
    return response
      .status(error.status)
      .json({ error: error.code, message: error.message })
  }
  if (error instanceof ZodError) {
    return response
      .status(422)
      .json({ error: "validation_failed", issues: error.issues })
  }
  return next(error)
}

function externalUserId(response: Response) {
  return (response.locals.auth as AuthContext).user.id
}

function parameter(request: Request, name: string) {
  const value = request.params[name]
  if (!value) throw new MarketplaceError("invalid_route_parameter", 400)
  return value
}

export async function getCatalog(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({ data: await CatalogServices.getCatalogHome() })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function listCategory(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CatalogServices.listCategories(request.query.parent ?? null),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function getCategory(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CatalogServices.getCategoryBySlug(parameter(request, "slug")),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function listProduct(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json(await CatalogServices.listProducts(request.query))
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function getProduct(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CatalogServices.getProductBySlug(parameter(request, "slug")),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function getStore(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CatalogServices.getStoreBySlug(parameter(request, "slug")),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function listStore(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.status(200).json({ data: await CatalogServices.listStores() })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function getCart(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.getCart(externalUserId(response)),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function addCartItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response
      .status(201)
      .json({
        data: await CommerceServices.addCartItem(
          externalUserId(response),
          request.body
        ),
      })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function updateCartItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.updateCartItem(
        externalUserId(response),
        parameter(request, "id"),
        request.body
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function removeCartItem(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.removeCartItem(
        externalUserId(response),
        parameter(request, "id")
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function listAddress(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.listAddresses(externalUserId(response)),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function createAddress(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response
      .status(201)
      .json({
        data: await CommerceServices.createAddress(
          externalUserId(response),
          request.body
        ),
      })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function updateAddress(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.updateAddress(
        externalUserId(response),
        parameter(request, "id"),
        request.body
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function deleteAddress(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.deleteAddress(
        externalUserId(response),
        parameter(request, "id")
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function checkout(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response
      .status(201)
      .json({
        data: await CommerceServices.checkout(
          externalUserId(response),
          request.body
        ),
      })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function listOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json(
      await CommerceServices.listOrders(externalUserId(response), request.query)
    )
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function getOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.getOrder(
        externalUserId(response),
        parameter(request, "id")
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

export async function cancelOrder(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    return response.json({
      data: await CommerceServices.cancelOrder(
        externalUserId(response),
        parameter(request, "id"),
        request.body
      ),
    })
  } catch (error) {
    return sendError(error, response, next)
  }
}

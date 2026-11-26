import {
  rawGetCatalog as getCatalogServices,
  rawGetCategory as getCategoryServices,
  rawGetProduct as getProductServices,
  rawGetStore as getStoreServices,
  rawListCategory as listCategoryServices,
  rawListProduct as listProductServices,
  rawListStore as listStoreServices,
} from "@/services/catalog"
import { parameter } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actGetCatalog(context: Context<ApiEnv>) {
  try {
    return context.json({ data: await getCatalogServices() }, 200)
  } catch (error) {
    throw error
  }
}
export async function actListCategory(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await listCategoryServices(context.req.query("parent") ?? null) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetCategory(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getCategoryServices(parameter(context, "slug")) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actListProduct(context: Context<ApiEnv>) {
  try {
    return context.json(await listProductServices(context.req.query()), 200)
  } catch (error) {
    throw error
  }
}
export async function actGetProduct(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getProductServices(parameter(context, "slug")) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetStore(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getStoreServices(parameter(context, "slug")) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actListStore(context: Context<ApiEnv>) {
  try {
    return context.json({ data: await listStoreServices() }, 200)
  } catch (error) {
    throw error
  }
}

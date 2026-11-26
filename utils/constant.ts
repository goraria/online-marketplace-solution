export const appGlobal = { name: "GorSop" }

export const storefrontPublicPrefixes = [
  "/",
  "/search",
  "/product",
  "/category",
  "/store",
] as const

export const publicPrefixes = [...storefrontPublicPrefixes] as const

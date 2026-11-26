import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores([".vercel/**", "dist/**", "node_modules/**", "vite-env.d.ts"]),
])

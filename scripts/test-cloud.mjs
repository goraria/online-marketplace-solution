import nextEnv from '@next/env'
import {spawnSync} from 'node:child_process'
nextEnv.loadEnvConfig(process.cwd(),true)
const {databaseUrl}=await import('../utils/environment.ts')
if(!databaseUrl)throw Error('DATABASE_URL required')
process.exitCode=spawnSync('pnpm',['exec','vitest','run','--config','vitest.cloud.config.ts','--configLoader','native','--no-cache',...process.argv.slice(2)],{stdio:'inherit'}).status??1

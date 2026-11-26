import {it,expect,afterAll} from 'vitest'
import {sql} from 'drizzle-orm'
import {getDatabase} from '@/database'
const db=getDatabase()
afterAll(async()=>{await db.$client.end()})
it('keeps only the application identity/session tables active after Commerce cutover',async()=>{
 const rows=await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`)
 expect(rows.map(r=>r.table_name)).toEqual(['account','legacy_session','legacy_verification','proof','rate_limit','revocation','session','user','verification'])
})
it('retains legacy catalog and inventory as an archive rather than deleting source data',async()=>{
 const counts=await db.execute(sql`SELECT (SELECT count(*)::int FROM legacy_commerce.product) AS products,(SELECT count(*)::int FROM legacy_commerce.inventory_balance) AS balances,(SELECT count(*)::int FROM legacy_commerce.store) AS stores`)
 expect(counts[0]).toMatchObject({products:140,balances:140,stores:16})
})
it('preserves account bindings to the original local user IDs',async()=>{
 const missing=await db.execute(sql`SELECT count(*)::int AS n FROM account a LEFT JOIN public."user" u ON u.id=a.user_id WHERE u.id IS NULL`)
 expect(missing[0]!.n).toBe(0)
})

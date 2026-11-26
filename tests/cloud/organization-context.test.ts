import { afterAll, expect, it } from "vitest"
import { sql } from "drizzle-orm"
import { getDatabase } from "@/database"
const db = getDatabase()
afterAll(async () => { await db.$client.end() })
it("cloud user context is nullable, UUID typed, and not a local IAM schema", async () => {
 const result = await db.execute(sql`SELECT column_name,is_nullable,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name IN('organization_id','team_id') ORDER BY column_name`)
 const rows = Array.from(result as unknown as Array<Record<string, unknown>>)
 expect(rows).toEqual([{ column_name: "organization_id", is_nullable: "YES", data_type: "uuid" }, { column_name: "team_id", is_nullable: "YES", data_type: "uuid" }])
 const iam = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN('organization','member','team','teamMember','invitation')`)
 expect(Array.from(iam as unknown as unknown[])).toEqual([])
})
it("persists personal and org/team contexts separately per user and rolls back all test rows", async () => {
 const a = crypto.randomUUID(), b = crypto.randomUUID(), org = crypto.randomUUID(), team = crypto.randomUUID()
 const rollback = new Error("fixture_rollback")
 await expect(db.transaction(async tx => {
  await tx.execute(sql`INSERT INTO public."user"(id,external_user_id,name,email) VALUES(${a}::uuid,${"fixture:" + a},'Context fixture',${a + "@fixture.invalid"}),(${b}::uuid,${"fixture:" + b},'Context fixture',${b + "@fixture.invalid"})`)
  await tx.execute(sql`UPDATE public."user" SET organization_id=${org}::uuid,team_id=${team}::uuid WHERE id=${a}::uuid`)
  const rows = Array.from(await tx.execute(sql`SELECT id,organization_id,team_id FROM public."user" WHERE id IN(${a}::uuid,${b}::uuid)`) as unknown as Array<Record<string, unknown>>)
  expect(rows.find(r => r.id === a)).toMatchObject({ organization_id: org, team_id: team })
  expect(rows.find(r => r.id === b)).toMatchObject({ organization_id: null, team_id: null })
  await tx.execute(sql`UPDATE public."user" SET organization_id=NULL,team_id=NULL WHERE id=${a}::uuid`)
  throw rollback
 })).rejects.toBe(rollback)
 expect(Array.from(await db.execute(sql`SELECT id FROM public."user" WHERE id IN(${a}::uuid,${b}::uuid)`) as unknown as unknown[])).toEqual([])
})
it("rejects a team context without an organization at the database boundary", async () => {
 const id = crypto.randomUUID()
 await expect(db.transaction(async tx => {
  await tx.execute(sql`INSERT INTO public."user"(id,external_user_id,name,email,team_id) VALUES(${id}::uuid,${"fixture:" + id},'Invalid context',${id + "@fixture.invalid"},${crypto.randomUUID()}::uuid)`)
 })).rejects.toMatchObject({ cause: { code: "23514" } })
})

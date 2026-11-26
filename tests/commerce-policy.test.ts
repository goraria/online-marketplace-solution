import {beforeEach,expect,it,vi} from "vitest"
const state=vi.hoisted(()=>({fetch:vi.fn()}))
vi.mock("@/utils/fetcher",()=>({fetcher:state.fetch}))
vi.mock("@/utils/environment",()=>({oauthCommerceAudience:"https://commerce.test",isProduction:true}))
import {rawGetOrder,rawCancelOrder,rawGetCart,rawCheckout} from "@/services/commerce"
import {getTableName} from "drizzle-orm"
import * as schema from "@/database/schema"
beforeEach(()=>{vi.clearAllMocks();state.fetch.mockResolvedValue({status:200,data:{data:{id:"order"}}})})
it("delegates order ownership to Commerce using only the server-held grant",async()=>{
 await rawGetOrder("private-bearer","aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
 const r=state.fetch.mock.calls[0]![0]
 expect(r.url.href).toBe("https://commerce.test/commerce/storefront/order/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
 expect(r.headers).toEqual({authorization:"Bearer private-bearer"})
 expect(r.body).toBeUndefined();expect(r.cache).toBe("no-store");expect(r.redirect).toBe("manual")
})
it.each([401,403,404,409,503])("preserves Commerce denial %s without falling back to local rows",async status=>{
 state.fetch.mockResolvedValue({status,data:{error:"denied"}})
 await expect(rawGetOrder("token","order")).rejects.toMatchObject({status,code:"denied"})
})
it("returns unavailable when Commerce is down",async()=>{
 state.fetch.mockRejectedValue(Error("network"))
 await expect(rawGetCart("token")).rejects.toMatchObject({status:503,code:"commerce_unavailable"})
})
it("forwards cancellation version without deriving authorization from a browser user ID",async()=>{
 await rawCancelOrder("grant","order",{version:2})
 expect(state.fetch.mock.calls[0]![0]).toMatchObject({method:"POST",body:{version:2},headers:{authorization:"Bearer grant"}})
})
it("forwards the expected server quote and idempotency key rather than charging locally",async()=>{
 const body={shippingAddressId:"address",version:2,expectedTotalMinor:50000,idempotencyKey:"checkout-key"}
 await rawCheckout("grant",body)
 expect(state.fetch.mock.calls[0]![0].body).toEqual(body)
})
it("declares no catalog, payment, order, stock or interaction tables in the application DB",()=>{
 const tables=Object.values(schema).filter(x=>x&&typeof x==="object").flatMap(x=>{try{return [getTableName(x as never)]}catch{return []}}).filter(Boolean)
 expect(tables.sort()).toEqual(["account","legacy_session","legacy_verification","proof","rate_limit","revocation","session","user","verification"])
})

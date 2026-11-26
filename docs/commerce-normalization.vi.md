# Chuẩn hoá Marketplace → Commerce và khắc phục F03/F04

Ngày kiểm chứng: 30/10/2026. Phạm vi: Marketplace, Restaurant và 8 platform service. Không thay đổi SSO, các app khác hoặc dependency lockfile.

## Kết quả dữ liệu trên Neon

| Nơi sở hữu                  | Kết quả                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| Marketplace public          | 9 bảng identity/session; giữ nguyên 3 user và 3 account                                      |
| Marketplace legacy_commerce | Giữ 38 bảng nghiệp vụ cũ và 23 enum; không DROP dữ liệu                                      |
| Commerce                    | Đã nhập 16 merchant, 16 store, 140 product, 140 variant, 140 balance; khôi phục 140 slug gốc |
| Restaurant                  | 19 bảng active: identity/session và nghiệp vụ nhà hàng riêng                                 |

Marketplace không còn khai báo bảng catalog, merchant, cart, order, stock, payment trong schema ứng dụng. Catalog/checkout/seller/admin gọi Commerce bằng bearer đã xác thực ở backend. Không dùng user ID do browser gửi để xác định người thao tác.

Dữ liệu nguồn được xuất vào file riêng quyền 0600 trong thư mục tạm, nhập bằng transaction và kiểm đếm. Receipt SHA-256 ở Commerce được đối chiếu trước khi chuyển bảng nguồn vào archive. Các bảng nguồn còn nguyên để kiểm tra/khôi phục có kế hoạch. Một số metadata cũ như brand chưa có projection trong DTO mới; chúng vẫn được lưu trong archive. Không coi archive là một lần sao lưu độc lập.

## F03: số tiền thanh toán do server quyết định

1. Browser gửi ID order, provider và thông tin checkout cần thiết; không quyết định amount/currency.
2. Payment dùng delegated bearer gọi `GET /commerce/order/:id/payment-quote`.
3. Commerce xác minh chính buyer sở hữu đơn, trạng thái hợp lệ và trả tổng tiền/currency đã lưu.
4. Payment dùng kết quả đó để tạo giao dịch. Payload giả mạo amount/currency bị từ chối; Commerce không truy cập được thì fail closed.
5. Canonical idempotency theo order ngăn tạo nhiều payment qua retry hoặc đổi provider để tạo lại giao dịch.
6. Checkout đối chiếu quote/version, modifier, giá và tồn kho trong transaction. Việc browser hiển thị giá không thay thế đối chiếu server.

Merchant có quyền xem order không đồng nghĩa có quyền dùng payment-quote của buyer khác. Refund theo return sử dụng quote riêng, yêu cầu finance/owner và return đã được chấp nhận/nhận hàng.

## F04: trạng thái order/payment/stock

| Tình huống                           | Xử lý                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Capture thành công                   | Ghi payment và durable delivery cùng transaction; Commerce xử lý sự kiện một lần                  |
| Provider thất bại/hủy                | Chuyển trạng thái hợp lệ và giải phóng reserve một lần                                            |
| Commerce/SSO tạm không truy cập được | Delivery được giữ trong DB, lease và retry có backoff                                             |
| Webhook trùng/sai thứ tự             | Dedupe, khoá bản ghi và chuyển trạng thái hợp lệ; không lùi giao dịch đã capture vì event cũ      |
| Đơn hết hạn/hủy rồi capture đến muộn | Không hồi sinh đơn/giữ lại stock; yêu cầu hoàn tiền, Payment thực hiện hoàn idempotent            |
| Partial/full refund                  | Cập nhật số tiền hoàn tích luỹ đơn điệu; replay không hoàn hai lần                                |
| Return                               | Trạng thái tài chính và trạng thái nhận hàng riêng; chỉ nhập lại stock theo nghiệp vụ nhận return |

Worker Payment chạy reconciliation và dispatch delivery. OAuth client credentials được lấy bằng helper Better Auth, tái sử dụng confidential client Payment hiện có; không thêm CRON_SECRET hay shared secret.

## Seller/admin và giao diện

- Studio query lọc membership + role ngay trong SQL, có count/search/pagination đúng qua nhiều merchant.
- SSO admin không tự động đọc toàn bộ dữ liệu kinh doanh.
- Tạo draft product/variant/stock là một transaction. Retry cùng nội dung được nhận; cùng key khác nội dung bị từ chối. Trùng SKU rollback toàn bộ.
- Media asset phải thuộc caller, đúng resource binding/trạng thái/visibility trước khi gắn sản phẩm.
- Cart hiện chọn một store. App từ chối trộn store; chưa phải checkout giỏ nhiều vendor trong một lần.
- Nút tiếp tục thanh toán, hủy đơn có version/reason và refresh trạng thái dùng dữ liệu server.

## Migration và lệnh vận hành

Đã chạy trên Neon trong nhiệm vụ này:

- Marketplace: export → import receipt verified → archive 38 bảng → archive 23 enum nghiệp vụ.
- Commerce: migrations payment-sync, storefront, catalog-slug, order-note, product-draft.
- Payment: refund-idempotency, commerce-delivery, return-sync.
- Restaurant: schema identity và nghiệp vụ nhà hàng.

Lệnh trong từng repository:

```sh
# Marketplace
pnpm db:migrate
pnpm test
pnpm test:cloud
pnpm exec next build --webpack

# Commerce
pnpm database:migrate
pnpm test
pnpm test:cloud
pnpm build

# Payment
node scripts/migrate-commerce.mjs
pnpm test
pnpm test:cloud
pnpm test:sandbox
pnpm build
pnpm worker:build
pnpm worker
```

Không dùng migration history Marketplace cũ để tạo lại 38 bảng: output Drizzle hiện tách sang `database/drizzle-app` và chỉ quản lý public. Không rollback bằng cách vừa bật lại writer cũ vừa giữ writer Commerce; cần dừng writer, đối chiếu dữ liệu phát sinh và thực hiện cutback được duyệt.

## Cấu hình còn phải triển khai

| Nơi                                    | Cấu hình                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketplace, Restaurant                | `NEXT_OAUTH_COMMERCE_AUDIENCE` = origin Commerce được quản lý, dev http://localhost:5059                                                    |
| Commerce                               | `NITRO_MEDIA_URL` = origin Media, dev http://localhost:5057                                                                                 |
| Payment                                | `NITRO_COMMERCE_URL`; `NITRO_OAUTH_CLIENT_ID/SECRET` của confidential client Payment hiện có; auth method client_secret_basic               |
| SSO registry, ngoài phạm vi sửa source | Đăng ký audience Commerce, cấp read/write scope đúng app và liên kết client Marketplace/Restaurant; cấp `commerce:payment:sync` cho Payment |
| Deployment                             | Chạy/schedule Payment reconciliation + delivery worker và worker Commerce; HTTPS cho các origin production                                  |

Giữ access token M2M tối đa 10 phút theo policy verifier hiện tại. Không đưa token/secret vào browser, metadata hoặc log. Tạo sản phẩm có Media cần grant chứa audience Media lẫn Commerce.

## Bằng chứng kiểm thử

| Dự án       | Vitest độc lập cloud | Vitest với Neon thật |
| ----------- | -------------------: | -------------------: |
| Marketplace |                   89 |                    3 |
| Restaurant  |                   75 |                   15 |
| Commerce    |                   37 |                   48 |
| Payment     |                   53 |                    8 |
| Notify      |                   51 |     Không chạy cloud |
| Resource    |                  123 |     Không chạy cloud |
| Discovery   |                   50 |     Không chạy cloud |
| Billing     |                   40 |     Không chạy cloud |
| Media       |                  103 |     Không chạy cloud |
| Insight     |                   64 |     Không chạy cloud |
| Tổng        |                  685 |                   74 |

Các test cloud tạo fixture có ID riêng và dọn fixture đó. Kiểm thử DB thật bao gồm quyền, checkout/reserve đua nhau, quote, late capture, refund, durable delivery/retry và schema ownership; các HTTP boundary SSO/Commerce/provider/Media trong integration suite được giả lập.

Stripe test API đã chạy thật: create/retry, capture, partial/full refund/replay, card decline và cancel. Suite riêng chỉ nhận sk_test_; không thu tiền thật.

TypeScript đã qua ở 10 repository; build Next của hai app, Nitro Commerce/Payment và Payment worker đã qua. Targeted ESLint ở phần app thay đổi đã qua. Có warning bundler về code splitting/optional pg-native; không làm build thất bại.

## Giới hạn nghiệm thu

F03 đã có server enforcement và kiểm thử. F04 đã có state machine/outbox/reconciliation cùng kiểm thử DB và Stripe sandbox; chưa coi là nghiệm thu production từ đầu tới cuối.

Chưa kiểm chứng luồng browser nhiều tài khoản, issuance grant từ SSO deployed, delivery M2M bằng confidential client production, provider webhook qua mạng công khai, hoặc sandbox MoMo/ZaloPay/VNPay. Cần cấu hình registry/worker nói trên rồi chạy các hành trình này trước khi mở thanh toán thật.

Restaurant mới có nền fullstack, schema và API bàn/đặt bàn/bếp. Đây không phải tuyên bố đã chuyển toàn bộ UI/API của legacy Restaurant. Chi tiết: xem báo cáo database-ownership.vi.md trong Restaurant.

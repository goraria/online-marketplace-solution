# Tích hợp Marketplace, Restaurant, SSO và tám service

> OAuth update — 2026-11-13: all confidential SSO token exchanges use fixed `client_secret_basic` in code; there is no auth-method environment selector. Business APIs keep `Bearer` tokens. Public PKCE clients keep `none`. A registered Post client needs a native Basic replacement and coordinated ID/secret/binding cutover.

Ngày kiểm tra: 2026-11-05. Phạm vi: hai ứng dụng, tám service và các API SSO đã được cho phép. Không thay đổi giao thức đăng nhập genericOAuth; không sửa các ứng dụng khác hoặc Restaurant legacy.

## Phân chia dữ liệu và quyền

| Nơi sở hữu          | Dữ liệu / trách nhiệm                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| SSO                 | Organization, member, team, teamMember, invitation, role; xác thực và cấp token OAuth                                                    |
| Commerce            | Hồ sơ merchant gắn organization, store/restaurant gắn team; catalog, customer, cart, order, inventory, fulfillment, pricing, procurement |
| Hai app             | User đồng bộ SSO; organizationId/teamId nullable chỉ là ngữ cảnh đang chọn; Restaurant giữ bàn, bếp, ca làm và nghiệp vụ nhà hàng        |
| Bảy service còn lại | Notify, Resource, Discovery, Payment, Billing, Media, Insight giữ dữ liệu của từng miền                                                  |

Không dùng ngữ cảnh đã lưu làm bằng chứng cấp quyền. Backend lấy quyền hiện tại từ SSO; thay đổi membership hoặc thu hồi phiên phải làm mất quyền. Owner/admin org được truy cập mọi team mà không cần tạo teamMember giả. Người dùng thường chỉ thấy team được phân công. Manager chỉ đổi role thấp hơn trong team của mình; không tự nâng quyền, cấp manager, mời/xóa member org. Mời mới mặc định member. SSO dùng Organization plugin cho các thao tác native, giữ kiểm tra owner cuối cùng; teamMember.role và quyền nghiệp vụ Commerce là phần mở rộng của hệ thống.

Một organization có thể có cả Store và Restaurant. Loại hình nằm ở store_profile.business_kind; merchant.business_kind được giữ làm giá trị mặc định tương thích. Không tạo bảng org/team/member trong hai app hoặc Commerce.

## Luồng API

Browser gọi endpoint cùng origin bằng caller/TanStack Query. Backend đọc phiên và chuyển bearer đến đúng service bằng fetcher. Token/credentials storage không trả vào JavaScript trình duyệt.

- GET/PUT /marketplace/context hoặc /restaurant/context đọc/lưu ngữ cảnh.
- /marketplace/organization/:operation và /restaurant/organization/:operation chuyển tiếp danh sách thao tác cố định tới SSO.
- SSO /external/organization/authorization trả quyền org/team hiện tại.
- SSO /external/organization/:operation kiểm tra resource/client/scope, subject, phiên còn hiệu lực và revocation qua native UserInfo trước khi gọi Organization API.
- Delegation session chỉ tồn tại trong AsyncLocalStorage của lời gọi server; không nhận session qua header tùy ý và không sửa genericOAuth.
- /commerce đi thẳng tới Commerce; bảy prefix còn lại đi tới service tương ứng.
- POST /internal/storage/credential chỉ nhận machine token đúng audience/scope, tuổi tối đa 120 giây; từ chối cookie/origin/browser request.

## Giao diện

| Nhóm                       | Marketplace                     | Restaurant                                          |
| -------------------------- | ------------------------------- | --------------------------------------------------- |
| Tài khoản / ngữ cảnh       | /account, selector trong seller | Selector trong layout quản trị                      |
| Org/team/member/invitation | /seller/organization            | Các trang org/member hiện có được nối workspace SSO |
| Nghiệp vụ Commerce         | /seller/workspace/[resource]    | /administrator/commerce/[resource]                  |
| Bảy service                | /seller/service/[domain]        | /administrator/service/[domain]                     |

Workspace nghiệp vụ có form theo loại dữ liệu cho merchant, store, category, attribute, product, SKU, warehouse, điều chỉnh/chuyển tồn, tax, promotion, supplier, purchase. Order/customer/fulfillment/return là danh sách nghiệp vụ; màn chi tiết order cung cấp thao tác vòng đời được backend cho phép. Không cho chỉnh tùy ý dữ liệu khách hàng hoặc trạng thái thanh toán bằng form CRUD.

Form hỗ trợ tham chiếu có tìm kiếm/phân trang, mảng tùy chọn/dòng hàng, xác nhận thao tác trạng thái, version và idempotency key khi cần. Ảnh sản phẩm đi qua Media; tạo bản nháp trước khi gắn ảnh. Các bảng dùng DataTable và component public của Primitive/Base UI, layouts/providers ở root.

Catalog/SKU, supplier và tax/promotion dùng chung cấp org: quyền ghi vẫn ở cấp org theo Commerce hiện tại. Manager/team role không tự có quyền đổi những bản ghi ảnh hưởng toàn org. Giao diện ẩn nút ghi tương ứng; warehouse/order/fulfillment tiếp tục kiểm tra quyền theo chi nhánh.

Restaurant tiếp tục dùng dữ liệu bàn, seating, kitchen, shift/task riêng; kiểm tra merchant/store và nhân sự chuyển sang quyền SSO. Chọn một chi nhánh lọc cả dữ liệu và tổng số; quyền server vẫn kiểm tra từng đối tượng.

Service panel có thông báo/đánh dấu đọc/archive/preferences, bookmark Resource, tìm kiếm Discovery, thư viện Media, lịch sử Payment, Billing invoice/subscription và Insight cá nhân. Insight client event là telemetry, không phải audit đáng tin cậy của thao tác tài chính.

## Migration và registry đã áp

- Hai app: thêm organization_id/team_id UUID nullable và ràng buộc team cần org; bảo toàn user hiện có (Marketplace 3, Restaurant 0 tại lúc migrate).
- Commerce: thêm business_kind cấp chi nhánh; giữ hồ sơ nghiệp vụ liên kết SSO.
- Theo phê duyệt, xóa 692 bản ghi thuộc merchant/store chưa liên kết: 16 merchant, 16 store, 224 category, 140 product, 140 variant, 16 warehouse, 140 balance. Không có order trong tập xóa; dữ liệu ngoài tập có fingerprint bảo toàn.
- Registry SSO đã có Commerce localhost:5059, Restaurant client gorth-restaurant-chain-management và liên kết đủ tám service cho hai client.
- Scope revision 2 thêm restaurant:read/write; revision 3 thêm hai scope credential storage. Revision cũ được giữ.
- Draft confidential Media bị disabled, chưa có secret. Không in secret vào log/chat/file.

## Cấu hình và thứ tự vận hành

1. Deploy code SSO mới và đặt NEXT_OAUTH_SCOPE_REVISION=3 trong env server SSO. Registry cloud đã cập nhật không đồng nghĩa code endpoint mới đã deploy.
2. Hai app dùng NEXT_PUBLIC_AUTH_URL=https://gorth-auth.vercel.app; NEXT_OAUTH_*_AUDIENCE trỏ lần lượt Notify 5052, Resource 5053, Discovery 5054, Payment 5055, Billing 5056, Media 5057, Insight 5058, Commerce 5059. Restaurant client ID là gorth-restaurant-chain-management. Production phải đăng ký URL HTTPS thực tế, callback và binding tương ứng; không dùng localhost cho deployment.
3. Mỗi service đặt NITRO_PUBLIC_AUTH_URL=https://gorth-auth.vercel.app và NITRO_PUBLIC_SERVICE_URL đúng URL của chính nó, sau đó restart. Không có fallback về VITE.
4. Đăng nhập lại hai app sau khi registry/scope SSO được deploy để lấy grant mới.
5. Tại SSO /admin/oauth/client/edit/c92b041f-d48c-41c8-aac8-ba820e44e553, dùng Generate/rotate secret bằng API native Better Auth. Lần khởi tạo draft tạo client native mới, nên client ID thay đổi; giao diện trả ID + secret một lần. Copy trực tiếp vào env server Media: NITRO_OAUTH_CLIENT_ID, NITRO_OAUTH_CLIENT_SECRET (Basic cố định trong code); sau đó bật client mới và restart Media. Những lần rotate tiếp theo giữ nguyên ID.
6. Mỗi app giữ AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET ở env server của chính app. Không đặt NEXT_PUBLIC_ cho các biến này. Hai app không cần AWS SDK.
7. Operator có role master đăng ký storage profile trong Media qua POST /media/storage-profile theo application của token: endpoint HTTPS, bucketName, region, credentialsUrl trỏ đúng /internal/storage/credential của app. Không có key trong metadata. Tạo bucket logic bằng POST /media/bucket (bucketName khớp AWS_BUCKET, allowedTypes gồm image). Với development, credential URL localhost được phép; deployment dùng HTTPS. Bucket storage cần CORS cho signed PUT từ origin app.
8. Media lấy credentials server-to-server từ registry profile, ký upload; browser fetch PUT URL được ký rồi complete. Không nhận endpoint/key tùy ý từ browser.

Các giá trị AWS và credential Media chưa được cung cấp ở thời điểm viết; chưa thể xác minh upload S3 thật. Không thêm CRON_SECRET, storage shared secret hoặc client worker riêng vào hai app.

## Kiểm thử và giới hạn bằng chứng

Unit/contract/SSR kiểm tra logic và khả năng render với Primitive cài sẵn; cloud suite dùng database thật nhưng có giả lập authority/provider ở các ranh giới bên ngoài. Chúng không thay thế kiểm thử trình duyệt nhiều tài khoản hoặc sandbox thanh toán.

| Dự án                                    |          Vitest unit/contract |                                                               Vitest cloud |
| ---------------------------------------- | ----------------------------: | -------------------------------------------------------------------------: |
| Marketplace                              |                       133 qua |                                                                      6 qua |
| Restaurant                               |                       332 qua |                                                                     35 qua |
| Commerce                                 |                        64 qua |                                                                     77 qua |
| Notify                                   |                        51 qua |                                       Không chạy cloud riêng trong đợt này |
| Resource                                 |                       123 qua |                                       Không chạy cloud riêng trong đợt này |
| Discovery                                |                        50 qua |                                       Không chạy cloud riêng trong đợt này |
| Payment                                  |                        53 qua |                                                  Chưa thử sandbox provider |
| Billing                                  |                        40 qua |                                       Không chạy cloud riêng trong đợt này |
| Media                                    |                       103 qua |                                                   Chưa có cấu hình S3 thật |
| Insight                                  |                        66 qua |                                       Không chạy cloud riêng trong đợt này |
| SSO bridge/verifier/team-role/credential | 43 qua trong 6 suite mục tiêu | Registry đã cập nhật; không chạy mutation Organization bằng tài khoản thật |

TypeScript của hai app, tám service và SSO đã qua. Nitro build cả tám service qua. Build hai app qua với lệnh `pnpm exec next build --webpack`; lệnh mặc định Turbopack bị sandbox chặn khi mở cổng worker CSS, nên không báo mặc định build đã qua.

SSO full suite được chạy trước bốn case manager bổ sung: 348 qua, 8 lỗi tại `tests/app-resource-contract.test.ts` (6 fixture binding), `tests/orbit-app-branding.test.ts` (1 màu), `tests/storage-credential.test.ts` (1 kỳ vọng 403 nhận 401). Registry cloud hai app đã được kiểm tra riêng; fixture bootstrap cũ không phản ánh script đăng ký mới. Không sửa policy của các app khác hoặc màu Orbit ngoài phạm vi.

Chưa xác nhận: hành trình click/keyboard/mobile trong browser, gửi email/push provider thật, giao dịch sandbox, upload S3 với credentials thật và các endpoint SSO mới trên deployment. Không mô tả hệ thống là đã nghiệm thu production chỉ từ số test.

Nguồn native: [Better Auth Organization](https://better-auth.com/docs/plugins/organization), [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth). Bridge bearer, role team và quyền dữ liệu Commerce là phần ứng dụng triển khai, không phải tính năng tự xuất hiện khi bật Organization plugin.

Chi tiết theo chủ sở hữu: [SSO bridge và credential](../../single-sign-on/docs/commerce-organization-bridge.vi.md), [Commerce và chi nhánh hỗn hợp](../../commerce-business/docs/commerce-app-integration.vi.md).

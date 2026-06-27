# Admin Fix Implementation Log

> File nay ghi lai huong trien khai va trang thai tung buoc trong qua trinh fix bug role Admin.
> Khi mot phan da duoc kiem tra OK, se cap nhat lai trang thai va ghi ro noi dung da dung.

## Pham vi hien tai

- Role Admin: dashboard, tai khoan nguoi dung, nhat ky he thong, ho so ca nhan, doi mat khau.
- Branding dung chung moi role: favicon, logo header, ten truong.
- Profile: bo sung cach doi anh dai dien thay cho thong bao "se noi API sau".
- Audit log: ghi nhan thao tac that cho login va quan tri tai khoan.
- Users: ra soat luong tao/sua/khoa/mo khoa/reset mat khau.

## Nguyen tac an toan DB

- Khong chay seed, migrate, reset database khi chua duoc duyet rieng.
- Cac thay doi audit log su dung bang `audit_logs` da co san, khong can migration.
- Khi test tren Supabase chung, cac hanh dong login/tao/sua/khoa/reset se ghi them ban ghi audit log that.
- Anh dai dien giai phap truoc mat luu vao cot `profiles.avatarUrl` da co san, khong can migration.
- Chua tao lai tai khoan `ADMIN001` tren Supabase vi day la thao tac ghi vao database chung.

## Bang trien khai

| Trang thai | Hang muc | Huong xu ly | Ghi chu |
|---|---|---|---|
| Hoan thanh | Branding favicon | Dung `Logo_PTIT_University_khong_khung.png` lam favicon trong `index.html`. | Dung chung moi role, bo ban logo co khung. |
| Hoan thanh | Branding header/login/print | Dung `Logo_PTIT_University_khong_khung.png` trong layout chung va man hinh login; doi ten truong thanh ten HV CNBCVT co so TP.HCM. | Asset dung chuan frontend nam trong `frontend/public`. |
| Hoan thanh | Audit log | Them ham ghi log, ghi LOGIN va thao tac users, hien thi nguoi thuc hien bang ten/ma tai khoan. | Khong doi schema. |
| Hoan thanh | Phan quyen audit/users | Audit log chi Admin xem; thao tac ghi users chi Admin. Endpoint doc users giu Admin/Manager vi cac luong Manager dang tim thanh vien hoi dong/sinh vien. | Giam rui ro vo luong Manager. |
| Hoan thanh | Tai khoan nguoi dung | Check trung username khi sua, xu ly mat khau trong modal sua hoac bo nham lan, cap nhat thong ke/luong reset. | Uu tien khong tao cam giac "bam ma khong co tac dung". |
| Hoan thanh | Ho so ca nhan/avatar | Cho chon anh tu may, validate anh/size, luu `avatarUrl` vao profile, hien thi avatar trong profile/header. | Giai phap local DB; sau nay co the chuyen Supabase Storage. |
| Hoan thanh | Doi mat khau | Sua validation, thong bao loi tieng Viet ro hon, chan mat khau moi trung mat khau cu, lam nut/field de dung hon. | Backend cung validate de tranh frontend bypass. |
| Hoan thanh | Branding tieu de sau dang nhap | Doi `Quan ly CSVC Ky tuc xa` thanh `QUAN LY CO SO VAT CHAT KY TUC XA` tren header sau dang nhap. | Login/header van dung logo PTIT trong `frontend/public`. |
| Hoan thanh | Login light mode | Man hinh dang nhap luon go class `dark` khi render de mac dinh sang. | Khong ghi de localStorage theme; sau khi vao app van giu toggle sang/toi nhu cu. |
| Hoan thanh | Audit log IP/detail | Lay IP tu `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`, fallback socket; doi nut xem chi tiet tu alert sang modal. | Log cu khong co IP thi hien `Chua ghi nhan`; log moi se co IP neu request co thong tin. |
| Hoan thanh | Avatar size | Anh JPG/PNG/WebP duoc resize ve toi da 256px va nen JPEG truoc khi gui; GIF nho giu nguyen. | Frontend chan file tren 2MB; backend tang body JSON len 1MB de tranh loi 413 voi avatar da nen. |

## Dong bo GitHub ngay 27/06/2026

- Da stash toan bo thay doi local truoc khi pull: `stash@{0}: codex-admin-fixes-before-pull`.
- Da pull `origin/main` bang fast-forward len commit `6f88922 Feat/asset lifecycle management (#14)`.
- Da apply lai stash sau pull.
- Conflict duy nhat nam o `frontend/src/pages/manager/ExportEquipmentPage.tsx`; da resolve theo phien ban moi tren GitHub, giu type guard cho `buildingCode`.
- Da chay `npx.cmd prisma generate` thanh cong sau khi tam dung backend de tranh khoa Prisma engine tren Windows.
- Da chay `npm.cmd install` trong `frontend` de lay dependency moi tu code GitHub cua ban nhom: `qrcode.react`, `react-to-print`.
- Khong drop stash sau khi apply; giu lai lam ban sao du phong toi khi ban xac nhan OK.

## Ket qua kiem tra

- Backend: `npm.cmd run build` thanh cong.
- Frontend: `npm.cmd run build` thanh cong.
- Prisma: `npx.cmd prisma generate` thanh cong.
- Khong chay seed/migrate/reset database.
- Khong tao tai khoan test hay ghi du lieu truc tiep vao Supabase trong qua trinh build.
- Backend can quyen network de ket noi Supabase trong `.env`; lan chay dau trong sandbox bi `P1001`, sau khi cap quyen network thi khoi dong thanh cong.
- Backend da duoc tam dung de chay `prisma generate`; can khoi dong lai khi test UI/API tiep.

## Ra soat loi dang nhap Admin

- Dang nhap `ADMIN001 / 123456` tra `401` vi Supabase hien tai khong co userCode `ADMIN001`.
- DB hien tai co Admin: `ADMIN_HCM / 123456`, trang thai `ACTIVE`, role `ADMIN`.
- Login bang `ADMIN_HCM / 123456` thanh cong va tra token role `ADMIN`.
- Da cap nhat goi y "Tai khoan dung thu" tren LoginPage theo DB hien tai:
  - Admin: `ADMIN_HCM / 123456`
  - Quan ly: `QL_MANTHIEN / 123456`
  - Sinh vien: `N21DCCN001 / 123456`
- Neu nhom van muon giu tai khoan `ADMIN001`, can tao them user Admin trong DB hoac chay seed dung moi truong. Chua thuc hien thao tac ghi DB nay.

## Checklist xac nhan sau khi trien khai

- Favicon hien dung logo khong khung.
- Header hien dung logo PTIT co khung va ten truong mau do do sang.
- Admin vao "Nhat ky he thong" thay ten nguoi thuc hien thay vi ID.
- Tao admin/user moi sinh log CREATE_USER.
- Dang nhap tai khoan moi sinh log LOGIN.
- Sua/khoa/mo khoa/reset mat khau sinh log tuong ung.
- Manager khong goi duoc cac API tao/sua/khoa/reset user.
- Doi anh dai dien trong ho so ca nhan cap nhat va hien lai sau refresh.
- Doi mat khau dung mat khau hien tai thi thanh cong; sai mat khau hien tai hien loi ro.

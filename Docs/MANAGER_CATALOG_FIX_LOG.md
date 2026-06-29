# MANAGER_CATALOG_FIX_LOG

## Pham vi ra soat

- Role: Quan ly.
- Man hinh: Khu nha, Phong o, Sinh vien theo phong, Danh muc thiet bi, Thiet bi.
- Trong tam: loi hien thi/tao moi khu nha, xem phong, tao/sua phong, them sinh vien vao phong, so luong thiet bi theo danh muc.

## Bang loi va dieu chinh

| Khu vuc | Loi phat hien | Nguyen nhan | Dieu chinh |
| --- | --- | --- | --- |
| Khu nha | Them khu nha xong xem phong/thong ke khong dung | Backend tra thieu metadata cua phong; frontend dung so lieu gia `rooms * 28`, `rooms * 5` | Backend tra them `floorId`, suc chua, so sinh vien dang o, so thiet bi, loai phong, dien tich, tinh trang, ghi chu. Frontend tinh tong sinh vien/thiet bi tu du lieu that |
| Khu nha | Form cho tao 0 phong moi tang, backend lai yeu cau toi thieu 1 | Frontend va DTO backend khong thong nhat rang buoc | Frontend doi mac dinh so phong moi tang tu 0 sang 1 va validate toi thieu 1 |
| Khu nha | Modal xem phong qua so sai va thieu thong tin nghiep vu | UI chi hien ma phong | Bo sung hien suc chua/sinh vien hien co va so thiet bi ngay tren tung phong |
| Phong o | Tao phong moi co the gan sai tang | Frontend gui `floorNumber` vao truong `floorId` | Select tang doi sang dung danh sach `building.floors`, value la `floor.id`, label la so tang |
| Phong o | Sua phong khong luu loai phong/dien tich/tinh trang/ghi chu | DTO/service backend chi nhan `roomCode`, `capacity`, `note`; frontend cung chua gui du cac truong | Mo rong DTO/service va frontend payload cho `roomType`, `areaM2`, `condition`, `note` |
| Sinh vien theo phong | Them sinh vien moi bi phu thuoc `Khu A/Khu B`, `A101/A102` | Option dang hardcode, khong doc tu database | Doi option khu/phong sang lay tu `allRooms` va loc theo khu nha dang chon |
| Danh muc thiet bi | So luong thiet bi theo danh muc co the ve 0 | Backend query `_count.assets` nhung khong tra `_count` cho frontend | Tra `_count` trong API danh muc thiet bi |
| Khu nha | Xoa khu nha khong duoc hoac tra loi ky thuat do khoa ngoai | Backend xoa truc tiep `DormBuilding` trong khi khu con tang/phong va database dang `Restrict` | Neu tat ca phong trong khu chua co du lieu nghiep vu thi xoa theo thu tu phong -> tang -> khu trong transaction; neu da co lich su thi chan va bao ro phong nao gay chan |
| Phong o | Khi xoa phong bi chan, UI chi bao loi chung chung | Frontend khong doc message loi tu backend trong catch | Doi sang dung `getApiErrorMessage` de hien dung ly do backend tra ve |

## Ghi chu database

- Bang `DormBuilding` hien khong thay cot luu that cho `status` va `description`.
- Vi day la database chung cua nhom, chua tu y tao migration de them cot moi.
- Neu sau nay muon luu trang thai/mo ta khu nha that su, can thong nhat schema Prisma va migrate chung voi nhom.

## Trang thai

- Da sua theo huong khong doi schema database.
- Backend build thanh cong bang `npm.cmd run build`.
- Frontend build thanh cong bang `npm.cmd run build`.
- Bo sung logic xoa khu/phong theo nguyen tac khong xoa cung du lieu da phat sinh nghiep vu.

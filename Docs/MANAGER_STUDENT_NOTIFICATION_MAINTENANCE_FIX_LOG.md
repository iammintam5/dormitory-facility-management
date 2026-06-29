# MANAGER_STUDENT_NOTIFICATION_MAINTENANCE_FIX_LOG

## Pham vi

- Role sinh vien: thong bao khi phieu bao hong duoc quan ly tiep nhan/duyet/tu choi/huy.
- Role quan ly: sua chua - bao tri, nhap/xuat thiet bi, sinh vien theo phong.

## Da xu ly

| Khu vuc | Van de | Dieu chinh |
| --- | --- | --- |
| Thong bao sinh vien | Notification tu phieu bao hong chi co trang thai, thieu ghi chu/ly do | Backend tao notification kem `Ly do` khi tu choi/huy va `Ghi chu` khi tiep nhan/duyet |
| Sua chua - bao tri | Moi phieu bao tri thieu tuy chon in PDF trong cot thao tac | Them action `In phieu PDF` tren bang desktop va mobile, tao mau in tu dong dien thong tin phieu |
| Sua chua - bao tri | Form nhap bao tri co nhieu truong chi phi/vat tu lam roi nghiep vu | Khong gui/khong hien cac truong chi phi, vat tu trong form tao/nghiem thu; giu schema cu de khong pha du lieu lich su |
| Sinh vien theo phong | Nut `Them sinh vien / Chuyen phong` va tab chuyen phong trong modal gay roi | Doi modal mo tu nut them thanh `Them sinh vien`, bo tab chuyen phong trong modal them; chuyen phong van thuc hien qua thao tac tren tung dong |
| Sinh vien theo phong | Nhap ma sinh vien chua tu dien thong tin | Them tra cuu sinh vien theo `studentCode`, tu dien ho ten, khoa, khoa hoc, so dien thoai |
| API users | Response user thieu `profile.course` | Bo sung `course` de frontend co the tu dien khoa hoc |
| Nhap/Xuat | Chi tiet phieu nhap hien phong, khong dung logic nhap kho | Bo cot phong trong bang thiet bi cua chi tiet phieu nhap/xuat |
| Nhap/Xuat | Chi tiet phieu hien cac truong chung tu/hop dong khong dong bo voi form hien tai | Luoc bo so chung tu/hop dong khoi modal chi tiet va tim kiem |

## Chua xu ly trong pass nay

- Chuan hoa mau phieu bao hong theo form nghiep vu day du.
- Lien ket de xuat thanh ly trong bao tri sang luong `Xuat` cua `Nhap/Xuat` theo mot quy trinh phe duyet ro rang.
- Tao ban in tu dong dien thong tin cho tat ca phieu trong `Nhap/Xuat` va `Cap phat - Thu hoi` thay vi mo mau PDF trang.
- Toi uu toc do load toan he thong: can do rieng theo tung API/page de tranh sua cam tinh.

## Kiem tra

- Backend build thanh cong bang `npm.cmd run build`.
- Frontend build thanh cong bang `npm.cmd run build`.

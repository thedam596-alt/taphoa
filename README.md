# 🏪 TẠP HÓA MAI CUA - HỆ THỐNG QUẢN LÝ BÁN HÀNG ĐA NỀN TẢNG (TỐI ƯU IPHONE)

Phần mềm quản lý bán hàng thực tế chuyên dụng cho cửa hàng tạp hóa gia đình, siêu thị mini và cửa hàng tiện lợi. Ứng dụng hoạt động mượt mà trên máy tính Windows/Mac, điện thoại Android và được **tối ưu hóa đặc biệt theo chuẩn PWA dành cho iPhone**.

---

## 📱 CÁC TỐI ƯU ĐẶC BIỆT DÀNH RIÊNG CHO IPHONE

1. **Chuẩn Progressive Web App (PWA) cho iOS**:
   - Tích hợp đầy đủ `manifest.webmanifest`, `sw.js` (Service Worker), bộ biểu tượng chuẩn Apple Touch Icon (`apple-touch-icon.png` 180x180, 192x192, 512x512).
   - Chạy ở chế độ **Standalone (Độc lập)**: Khi mở từ Màn hình chính iPhone, ứng dụng hiển thị toàn màn hình 100%, không có thanh địa chỉ Safari hay thanh điều hướng trình duyệt.
   - Đặt tên ngắn gọn trên màn hình chính: **"Mai Cua"**.

2. **Thiết kế công thái học (Ergonomics) một tay & Safe Area**:
   - Tối ưu hóa vùng hiển thị cho iPhone có **Tai thỏ (Notch)** và **Dynamic Island** bằng `env(safe-area-inset-top)`.
   - Thanh điều hướng dưới đáy hỗ trợ thanh trượt vuốt Home của iPhone bằng `env(safe-area-inset-bottom)`.
   - Viewport chuẩn `viewport-fit=cover`, triệt tiêu hoàn toàn hiện tượng thanh cuộn ngang ngoài ý muốn.
   - **Thanh menu dưới đáy màn hình gồm đúng 5 mục chính**:
     1. **Trang chủ**: Thống kê doanh thu, bán nhanh, sản phẩm bán chạy ghim trang chủ.
     2. **Bán hàng**: Màn hình tính tiền, giỏ hàng, nút tiền nhanh.
     3. **Sản phẩm**: Danh mục, tìm kiếm, sửa giá, ngừng kinh doanh.
     4. **Kho hàng**: Số lượng tồn, cảnh báo hết hàng, kiểm kê kho.
     5. **Thêm**: Ngăn kéo iOS mở rộng (Nhập hàng, Lịch sử hóa đơn, Báo cáo lãi lỗ, Cài đặt, Hướng dẫn iPhone).

3. **Màn hình tính tiền nổi bật cho thu ngân iPhone**:
   - Hộp hiển thị **TỔNG TIỀN PHẢI THU** lớn, rõ ràng, dễ nhìn từ xa.
   - Bàn phím số tự động kích hoạt trên iPhone nhờ thuộc tính `inputmode="numeric"`.
   - Các nút mệnh giá tiền nhanh (10k, 20k, 50k, 100k, 200k, 500k, Đủ tiền) kích thước lớn, dễ chạm bằng một ngón tay cái.

4. **Quét mã vạch tối ưu cho Safari iOS**:
   - Tự động kích hoạt Camera sau góc rộng.
   - Khung căn chỉnh mã vạch với 4 góc viền và tia laser quét trực quan.
   - **Cơ chế chống quét lặp:** Khóa quét trùng lặp trong vòng 1.5 giây để tránh nhảy số lượng ngoài ý muốn.
   - **Tương thích 100% với iOS Safari:** Cung cấp nút *Chụp ảnh mã từ iPhone* sử dụng camera gốc của iOS, hoạt động hoàn hảo ngay cả trên mạng Wi-Fi nội bộ chưa có HTTPS.
   - Có ô nhập mã vạch thủ công cho bàn phím hoặc máy quét USB/Bluetooth.

5. **Chụp ảnh sản phẩm & Nén ảnh thông minh**:
   - Cho phép mở trực tiếp Camera iPhone hoặc chọn ảnh từ Album Photos.
   - **Tự động nén ảnh trên máy khách (Client-side Canvas Compression):** Tự động chuyển đổi ảnh 12MB gốc của iPhone thành file ảnh JPEG sắc nét chỉ ~150KB - 200KB trước khi tải lên, giúp lưu ảnh tức thì và tiết kiệm 95% băng thông.
   - Ảnh được lưu trữ bền vững trên máy chủ/đám mây, hiển thị đồng bộ ngay lập tức trên máy tính.

6. **Bảo vệ an toàn khi mất mạng (Offline Guard)**:
   - Tự động nhận diện mất kết nối và hiển thị thanh cảnh báo đỏ trên đầu màn hình.
   - Service Worker lưu trữ giao diện (App Shell) để mở lại ứng dụng tức thì.
   - **Quy tắc an toàn tài chính:** Tạm khóa nút thanh toán khi mất mạng để ngăn ngừa nguy cơ trùng lặp hóa đơn hoặc bán vượt quá tồn kho thực tế.

---

## 📲 HƯỚNG DẪN CÀI ĐẶT LÊN MÀN HÌNH CHÍNH IPHONE (ADD TO HOME SCREEN)

Người dùng thực hiện 5 bước đơn giản trên iPhone:

1. **Mở Safari**: Mở địa chỉ ứng dụng Tạp Hóa Mai Cua trên trình duyệt Safari (ví dụ: `http://192.168.1.31:5000` hoặc tên miền HTTPS).
2. **Nhấn nút Chia sẻ**: Chạm vào biểu tượng ô vuông có mũi tên hướng lên (`⎋`) ở thanh công cụ dưới đáy Safari.
3. **Chọn "Thêm vào MH chính"**: Cuộn xuống danh sách tùy chọn và chọn dòng **"Thêm vào MH chính" (Add to Home Screen)** có biểu tượng dấu cộng (`+`).
4. **Xác nhận tên**: Tên ứng dụng được điền sẵn là **"Mai Cua"** > Nhấn nút **"Thêm" (Add)** ở góc trên bên phải.
5. **Mở ứng dụng**: Biểu tượng ứng dụng với hình giỏ hàng màu xanh lá sẽ xuất hiện ngay trên màn hình chính iPhone. Mở ra để sử dụng toàn màn hình độc lập như App tải từ App Store!

---

## ☁️ HƯỚNG DẪN ĐỒNG BỘ TRỰC TUYẾN & TRIỂN KHAI CLOUD

Ứng dụng hỗ trợ đồng bộ dữ liệu đa thiết bị theo 2 phương án:

### Phương án A: Dùng trong cửa hàng qua mạng Wi-Fi (Không tốn chi phí)
1. Máy tính tại quầy chạy: `npm start`.
2. Mọi điện thoại iPhone / Android của nhân viên kết nối chung mạng Wi-Fi cửa hàng.
3. Mở địa chỉ LAN (ví dụ: `http://192.168.1.31:5000`). Mọi thay đổi về hàng hóa, giá bán, tồn kho được đồng bộ tức thì qua máy chủ Node.js SQLite.

### Phương án B: Triển khai trực tuyến lên Render / Vercel (Có HTTPS miễn phí)
Để quản lý từ xa qua 4G/5G và kích hoạt camera web trên mọi thiết bị:
1. Đẩy mã nguồn lên GitHub.
2. Tạo Web Service miễn phí trên [Render.com](https://render.com) (tệp cấu hình sẵn `render.yaml`):
   - **Build Command**: `cd client && npm install && npm run build && cd .. && npm install`
   - **Start Command**: `node server/server.js`
3. Render tự động cấp link HTTPS (ví dụ: `https://taphoa-maicua.onrender.com`).
4. Với Vercel: dự án đã có sẵn tệp cấu hình `vercel.json`.

### Phương án C: Kết nối cơ sở dữ liệu Supabase (PostgreSQL Cloud)
Tệp [server/supabase_schema.sql](file:///c:/Users/ASUS/Documents/antigravity/adventurous-heisenberg/server/supabase_schema.sql) đã được chuẩn bị đầy đủ:
1. Tạo dự án miễn phí tại [Supabase.com](https://supabase.com).
2. Vào mục **SQL Editor**, dán toàn bộ nội dung tệp `server/supabase_schema.sql` và bấm **Run**.
3. Toàn bộ 11 bảng dữ liệu, chỉ mục tìm kiếm và kênh Realtime Replication sẽ được kích hoạt tự động.

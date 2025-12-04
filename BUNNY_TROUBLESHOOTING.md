# 🔧 Bunny Storage Troubleshooting

## Vấn đề: "Không thể đọc file"

### Bước 1: Kiểm tra biến môi trường

1. Mở file `.env.local` và kiểm tra:
```env
VITE_BUNNY_STORAGE_ZONE=webvideonhatbang
VITE_BUNNY_STORAGE_PASSWORD=9307c7be-8614-44cc-b9ea1b68a7fd-a148-4bbc
VITE_BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
VITE_BUNNY_STORAGE_CDN_URL=webxemvideo.b-cdn.net
```

2. **QUAN TRỌNG**: Restart dev server sau khi thay đổi .env:
```bash
# Dừng server (Ctrl+C)
# Chạy lại
npm run dev
```

### Bước 2: Test kết nối

1. Vào trang **"Lớp học của tôi"**
2. Bạn sẽ thấy card debug màu xám ở trên cùng
3. Click nút **"Test kết nối"**
4. Xem kết quả:
   - ✅ Màu xanh = OK
   - ❌ Màu đỏ = Có lỗi

### Bước 3: Kiểm tra Console

Mở Console (F12 → Console tab) và tìm:

```
🔧 Bunny Storage Config: {
  zone: "webvideonhatbang",
  hostname: "storage.bunnycdn.com",
  cdnUrl: "webxemvideo.b-cdn.net",
  passwordConfigured: true
}
```

Nếu thấy `❌ Missing` → Biến môi trường chưa load

### Bước 4: Cấu hình Bunny Dashboard

1. Đăng nhập [Bunny.net Dashboard](https://dash.bunny.net)
2. Vào **Storage** → **webvideonhatbang**
3. Kiểm tra:
   - ✅ Storage Zone đang active
   - ✅ Password Key còn hiệu lực
   - ✅ CORS được bật (nếu cần)

#### Bật CORS (nếu cần):
1. Vào Storage Zone → **Settings**
2. Tìm **CORS Settings**
3. Thêm:
   - Allowed Origins: `*` hoặc domain của bạn
   - Allowed Methods: `GET, PUT, DELETE`
   - Allowed Headers: `*`

### Bước 5: Test Upload thủ công

Thử upload bằng cURL:

```bash
curl -X PUT \
  -H "AccessKey: 9307c7be-8614-44cc-b9ea1b68a7fd-a148-4bbc" \
  -H "Content-Type: text/plain" \
  --data "test content" \
  https://storage.bunnycdn.com/webvideonhatbang/test.txt
```

Nếu thành công → Kiểm tra file tại:
```
https://webxemvideo.b-cdn.net/test.txt
```

---

## Các lỗi thường gặp

### ❌ "Bunny Storage chưa được cấu hình"

**Nguyên nhân**: Biến môi trường chưa load

**Giải pháp**:
1. Kiểm tra `.env.local` có đúng format
2. Restart dev server
3. Clear cache: `npm run dev -- --force`

### ❌ "Upload thất bại: 401 Unauthorized"

**Nguyên nhân**: Access Key sai hoặc hết hạn

**Giải pháp**:
1. Vào Bunny Dashboard
2. Storage → webvideonhatbang → **FTP & API Access**
3. Copy Password mới
4. Cập nhật `.env.local`
5. Restart server

### ❌ "Upload thất bại: 404 Not Found"

**Nguyên nhân**: Storage Zone không tồn tại

**Giải pháp**:
1. Kiểm tra tên zone: `webvideonhatbang`
2. Vào Bunny Dashboard xác nhận zone name
3. Cập nhật `VITE_BUNNY_STORAGE_ZONE` nếu sai

### ❌ "CORS Error"

**Nguyên nhân**: Trình duyệt block request

**Giải pháp**:
1. Bật CORS trong Bunny Dashboard (xem Bước 4)
2. Hoặc upload qua server-side (không qua browser)

### ❌ File upload thành công nhưng không mở được

**Nguyên nhân**: CDN chưa propagate hoặc URL sai

**Giải pháp**:
1. Đợi 1-2 phút để CDN propagate
2. Kiểm tra URL format:
   ```
   https://webxemvideo.b-cdn.net/class-documents/...
   ```
3. Thử truy cập trực tiếp URL trong tab mới
4. Clear cache trình duyệt

---

## Debug Logs

Khi upload, bạn sẽ thấy logs trong Console:

### Upload thành công:
```
📤 Uploading to Bunny: {
  zone: "webvideonhatbang",
  path: "class-documents/...",
  fileName: "document.pdf",
  fileSize: "2.5 MB"
}
📡 Upload response: {
  status: 201,
  statusText: "Created",
  ok: true
}
✅ Upload successful! CDN URL: https://webxemvideo.b-cdn.net/...
```

### Upload thất bại:
```
❌ Bunny upload failed: {
  status: 401,
  statusText: "Unauthorized",
  error: "Invalid access key"
}
```

---

## Liên hệ hỗ trợ

Nếu vẫn gặp vấn đề:

1. Copy toàn bộ logs trong Console
2. Chụp màn hình lỗi
3. Gửi cho admin kèm thông tin:
   - Tên file đang upload
   - Kích thước file
   - Loại file
   - Logs từ Console

---

## Checklist nhanh

- [ ] File `.env.local` có đầy đủ 4 biến
- [ ] Đã restart dev server
- [ ] Test kết nối thành công (nút debug)
- [ ] Console không có lỗi màu đỏ
- [ ] Bunny Dashboard storage zone active
- [ ] File size < 50MB
- [ ] CORS đã bật (nếu cần)

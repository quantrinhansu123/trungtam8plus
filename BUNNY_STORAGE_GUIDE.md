# Hướng dẫn sử dụng Bunny CDN Storage

## 🎯 Tổng quan

Hệ thống đã được tích hợp **Bunny CDN Storage** để lưu trữ tài liệu học tập thay thế Firebase Storage.

### Ưu điểm của Bunny CDN:
- ✅ **Miễn phí** với gói cơ bản
- ✅ **CDN toàn cầu** - tốc độ tải nhanh
- ✅ **Giá rẻ** khi scale ($0.01/GB storage, $0.01/GB bandwidth)
- ✅ **Không giới hạn bandwidth** với gói trả phí
- ✅ **API đơn giản** - dễ tích hợp

---

## 🔧 Cấu hình

### 1. Biến môi trường (.env.local)

```env
VITE_BUNNY_STORAGE_ZONE=webvideonhatbang
VITE_BUNNY_STORAGE_PASSWORD=9307c7be-8614-44cc-b9ea1b68a7fd-a148-4bbc
VITE_BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
VITE_BUNNY_STORAGE_CDN_URL=webxemvideo.b-cdn.net
```

### 2. Cấu trúc thư mục trên Bunny

```
webvideonhatbang/
└── class-documents/
    ├── {classId1}/
    │   ├── 1234567890_document1.pdf
    │   └── 1234567891_presentation.pptx
    └── {classId2}/
        └── 1234567892_worksheet.docx
```

---

## 📚 Sử dụng

### Upload tài liệu

1. Vào **"Lớp học của tôi"**
2. Chọn lớp học
3. Trong card **"Tài liệu học tập"**, click **"Thêm tài liệu"**
4. Chọn phương thức:
   - **Nhập link**: Dán link từ Google Drive, Dropbox, etc.
   - **Tải file lên**: Upload file trực tiếp lên Bunny CDN

### Các loại file hỗ trợ

- 📄 PDF
- 📝 Word (.doc, .docx)
- 📊 Excel (.xls, .xlsx)
- 📽️ PowerPoint (.ppt, .pptx)
- 🖼️ Hình ảnh (.jpg, .png, .gif)
- 🎥 Video (.mp4, .avi, .mov)
- Giới hạn: **50MB/file**

---

## 🔌 API Reference

### Upload file

```typescript
import { uploadToBunny, generateFilePath } from "@/utils/bunnyStorage";

const file = // File object
const classId = "class-123";
const filePath = generateFilePath(classId, file.name);

const result = await uploadToBunny(file, filePath);

if (result.success) {
  console.log("CDN URL:", result.url);
  // https://webxemvideo.b-cdn.net/class-documents/class-123/1234567890_file.pdf
} else {
  console.error("Error:", result.error);
}
```

### Delete file

```typescript
import { deleteFromBunny } from "@/utils/bunnyStorage";

const filePath = "class-documents/class-123/1234567890_file.pdf";
const success = await deleteFromBunny(filePath);
```

---

## 🚀 Migration từ Firebase Storage

Nếu bạn có tài liệu cũ trên Firebase Storage:

1. Tài liệu cũ vẫn hoạt động bình thường
2. Tài liệu mới sẽ tự động upload lên Bunny
3. Không cần migrate thủ công

---

## 💰 Chi phí

### Free Tier (hiện tại)
- Storage: Unlimited
- Bandwidth: 1GB/tháng miễn phí
- Sau đó: $0.01/GB

### Nếu cần nâng cấp
- Storage: $0.01/GB/tháng
- Bandwidth: $0.01/GB
- Rất rẻ so với Firebase Storage!

---

## 🔒 Bảo mật

- ✅ File được lưu trên CDN riêng
- ✅ Access Key được bảo vệ trong .env
- ✅ CORS được cấu hình tự động
- ⚠️ **Lưu ý**: Không commit .env.local lên Git!

---

## 🐛 Troubleshooting

### Lỗi "Bunny Storage chưa được cấu hình"
- Kiểm tra file `.env.local` có đầy đủ biến môi trường
- Restart dev server: `npm run dev`

### Upload thất bại
- Kiểm tra file size < 50MB
- Kiểm tra Access Key còn hiệu lực
- Xem console log để debug

### File không tải được
- Kiểm tra CDN URL có đúng không
- Đợi 1-2 phút để CDN propagate
- Thử clear cache trình duyệt

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, liên hệ quản trị viên hoặc check:
- [Bunny.net Dashboard](https://dash.bunny.net)
- [Bunny Storage API Docs](https://docs.bunny.net/reference/storage-api)

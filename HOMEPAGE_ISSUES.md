# Báo cáo Tổng hợp Vấn đề & Lỗi Liên quan đến Trang chủ (Homepage)

> **Thời gian ghi nhận:** 05/09/2026  
> **Trạng thái:** Chờ xử lý  
> **Phạm vi ảnh hưởng:** Trang chủ (`/`), Khung giao diện dùng chung (`Layout`), và Quản lý Media (`Learning Media Assets`)

---

## 📌 Bảng tóm tắt các vấn đề

| STT | Mã lỗi / Cảnh báo | Thành phần phát sinh | Phía ảnh hưởng | Mức độ |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `GET /api/v1/centers 401 (Unauthorized)` | `Footer.tsx` | Frontend / Backend | Trung bình |
| 2 | `GET /api/v1/learning/media-assets/files/... 500` | `FacilitiesActivities.tsx` | Backend / Dữ liệu | Cao |
| 3 | `Blocked aria-hidden on an element...` | `HeroSlideshow.tsx` | Frontend (A11Y) | Thấp (Warning) |

---

## 1. Vấn đề 1: Lỗi 401 Unauthorized tại API `/api/v1/centers`

### 1.1. Hiện tượng & Log Console
```text
:5173/api/v1/centers:1 Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

### 1.2. Vị trí mã nguồn
- **Frontend:** [src/components/Footer.tsx](file:///c:/Users/Admin/kt-fe/src/components/Footer.tsx#L27-L38)
  ```tsx
  Promise.all([
    homepageService.getPublic().catch(() => null),
    academicService.centers.list().catch(() => []), // <-- Gọi GET /api/v1/centers
  ])
  ```
- **Backend:** `src/modules/academic/controllers/centers.controller.ts`
  ```typescript
  @ApiBearerAuth()
  @Permissions('classes.manage')
  @Controller('centers')
  export class CentersController { ... }
  ```

### 1.3. Nguyên nhân chi tiết
1. Component `Footer` nằm trong `Layout.tsx` được hiển thị ở mọi trang, bao gồm cả trang chủ public (`/`) và các trang trước khi đăng nhập.
2. `Footer` gọi `academicService.centers.list()` để lấy danh sách cơ sở nhằm hiển thị địa chỉ trung tâm.
3. Tuy nhiên, endpoint `GET /api/v1/centers` ở backend được bảo vệ bởi guard yêu cầu quyền quản trị viên (`@Permissions('classes.manage')`) và JWT Token.
4. Khi người dùng là khách vãng lai, chưa đăng nhập, hoặc vừa đăng nhập xong mà token chưa kịp gắn vào request ban đầu của Footer, backend trả về mã `401 Unauthorized`.

### 1.4. Đề xuất phương án xử lý
- **Phương án Frontend (Nhanh):**
  - Trong `Footer.tsx`, chỉ gửi request `academicService.centers.list()` nếu đã có token đăng nhập hợp lệ trong `tokenStorage.getAccessToken()`.
  - Nếu chưa đăng nhập hoặc request thất bại, sử dụng danh sách thông tin cơ sở mặc định có sẵn (fallback).
- **Phương án Backend (Toàn diện):**
  - Tạo endpoint công khai riêng: `GET /api/v1/centers/public` hoặc gỡ bỏ quyền `classes.manage` đối với riêng phương thức `findAll()` công khai để khách vãng lai có thể xem danh sách địa chỉ các cơ sở trung tâm.

---

## 2. Vấn đề 2: Lỗi 500 Internal Server Error khi tải ảnh Media Asset

### 2.1. Hiện tượng & Log Console
```text
:5173/api/v1/learning/media-assets/files/e166d0de-6013-4dd9-9b41-cb8b479754dd.png:1 
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

### 2.2. Vị trí mã nguồn
- **Frontend:** [src/pages/facilitiesPage/FacilitiesActivities.tsx](file:///c:/Users/Admin/kt-fe/src/pages/facilitiesPage/FacilitiesActivities.tsx#L75-L87)
  ```tsx
  <img
    src={img.url} // url dạng: /api/v1/learning/media-assets/files/e166d0de-6013-4dd9-9b41-cb8b479754dd.png
    alt={img.altText}
    ...
  />
  ```
- **Backend:** `src/modules/learning/controllers/media-assets.controller.ts`
  ```typescript
  @Get('files/:filename')
  @Public()
  serveFile(@Param('filename') filename: string, @Res() response: Response) {
    return response.sendFile(
      this.mediaAssetsService.resolveUploadedFile(filename),
    );
  }
  ```

### 2.3. Nguyên nhân chi tiết
1. Trong database có bản ghi `media_assets` lưu tên file `e166d0de-6013-4dd9-9b41-cb8b479754dd.png`.
2. Tuy nhiên, trên đĩa cứng máy chủ tại thư mục `uploads/learning/`, file vật lý này **không tồn tại** (do dữ liệu seed cũ hoặc file đã bị xóa thủ công nhưng DB chưa cập nhật).
3. Khi trình duyệt gọi `GET .../files/e166d0de-6013-4dd9-9b41-cb8b479754dd.png`, hàm `response.sendFile()` của Express gặp lỗi `ENOENT` (File not found).
4. Do controller không bắt lỗi `ENOENT`, lỗi này bị đẩy ra bộ xử lý ngoại lệ toàn cục của NestJS và trả về mã **500 Internal Server Error** thay vì `404 Not Found`.

### 2.4. Đề xuất phương án xử lý
- **Xử lý Backend:**
  - Trong `media-assets.controller.ts` hoặc `media-assets.service.ts`, kiểm tra `fs.existsSync(filePath)` trước khi gọi `response.sendFile()`.
  - Nếu file không tồn tại, trả về `NotFoundException('File không tồn tại')` (mã HTTP 404).
- **Xử lý Frontend:**
  - Bổ sung sự kiện `onError` cho thẻ `<img>` trong `FacilitiesActivities.tsx` và các component hiển thị media khác:
    ```tsx
    <img
      src={img.url}
      onError={(e) => {
        (e.target as HTMLImageElement).src = defaultFallbackImageUrl;
      }}
      ...
    />
    ```
- **Xử lý Dữ liệu:**
  - Kiểm tra lại các bản ghi media trong database và đồng bộ các file mẫu vào thư mục `uploads/learning/`.

---

## 3. Vấn đề 3: Cảnh báo Accessibility `Blocked aria-hidden` trên Hero Carousel

### 3.1. Hiện tượng & Log Console
```text
Blocked aria-hidden on an element because its descendant retained focus. 
The focus must not be hidden from assistive technology users. 
Avoid using aria-hidden on a focused element or its ancestor. 
Element with focus: <div.h-[600px] relative>
Ancestor with aria-hidden: <div.slick-slide> <div data-index="0" class="slick-slide" tabindex="-1" aria-hidden="true" ...>
```

### 3.2. Vị trí mã nguồn
- **Frontend:** [src/pages/homePage/components/HeroSlideshow.tsx](file:///c:/Users/Admin/kt-fe/src/pages/homePage/components/HeroSlideshow.tsx#L50-L88)
  ```tsx
  <Carousel autoplay effect="fade" className="h-full">
    {slides.map(slide => (
      <div key={slide.id} className="h-[600px] relative">
        ...
        <Button onClick={...}>{slide.ctaLabel}</Button>
      </div>
    ))}
  </Carousel>
  ```

### 3.3. Nguyên nhân chi tiết
1. `HeroSlideshow` sử dụng `<Carousel autoplay effect="fade">` của Ant Design (được xây dựng trên `react-slick`).
2. Khi slider tự động chuyển cảnh (`autoplay`), thư viện `react-slick` đánh dấu slide vừa rời đi là `aria-hidden="true"` và `tabindex="-1"`.
3. Nếu người dùng vừa click hoặc focus vào slide đó (hoặc slide chứa phần tử nhận focus như nút `<Button>`), phần tử con vẫn còn giữ trạng thái focus trong khi phần tử cha đã bị ẩn khỏi bộ đọc màn hình.
4. Trình duyệt Chromium/Edge phát hiện vi phạm tiêu chuẩn W3C WAI-ARIA và ghi nhận cảnh báo.
5. *Lưu ý:* Đây là cảnh báo tiêu chuẩn tiếp cận (A11Y), không gây lỗi crash hay ảnh hưởng trải nghiệm người dùng thông thường.

### 3.4. Đề xuất phương án xử lý
- Cấu hình thêm thuộc tính cho Carousel hoặc tùy chỉnh slick settings:
  ```tsx
  <Carousel
    autoplay
    effect="fade"
    focusOnSelect={false}
    accessibility={false} // hoặc tùy biến blur khi slide chuyển
  >
  ```
- Thêm thuộc tính `tabIndex={-1}` hoặc blur focus khỏi nút CTA khi slide không còn active.

---

## 📋 Danh sách công việc (Checklist khi xử lý)

- [ ] **Frontend**: Thêm kiểm tra token trước khi gọi `academicService.centers.list()` trong `Footer.tsx`.
- [ ] **Frontend**: Thêm `onError` fallback image cho Gallery tại `FacilitiesActivities.tsx`.
- [ ] **Frontend**: Tinh chỉnh Carousel config trong `HeroSlideshow.tsx` để giảm thiểu warning aria-hidden.
- [ ] **Backend**: Cập nhật `MediaAssetsController.serveFile` để kiểm tra file tồn tại và trả về 404 thay vì văng 500.
- [ ] **Backend**: Cân nhắc mở endpoint lấy danh sách cơ sở công khai (`GET /centers/public`).

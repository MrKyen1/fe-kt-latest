# Tài Liệu Tích Hợp API: Quản Lý Nhiều Ảnh Trung Tâm (Centers)

Tài liệu này đặc tả các thay đổi ở phía Backend liên quan đến tính năng tải lên nhiều ảnh (**multi-image upload**) cho thực thể **Trung tâm (Centers)** để đội ngũ phát triển **Frontend** tích hợp.

---

## 1. Yêu Cầu Tổng Quan

* **Backend đã hoàn tất:**
  * Có bảng lưu trữ nhiều ảnh `centers_images` liên kết với bảng `centers`.
  * Hỗ trợ nhận danh sách ảnh dạng mảng chuỗi URL thông qua API tạo mới/cập nhật.
  * Tự động trả về danh sách ảnh đã được sắp xếp theo thứ tự `orderIndex`.
* **Frontend cần thực hiện:**
  * Cập nhật kiểu dữ liệu (`types`) của Center để hỗ trợ thuộc tính `images`.
  * Thay thế ô nhập URL dạng text bằng component Upload nhiều file (ví dụ: `<Upload>` của Ant Design).
  * Upload ảnh lên máy chủ lưu trữ phương tiện trước để lấy URL, sau đó gửi mảng các URL này trong request body tạo/cập nhật Center.

---

## 2. Đặc Tả Chi Tiết API

### A. API Tạo Mới Trung Tâm (Create Center)
* **Phương thức:** `POST`
* **Đường dẫn (Endpoint):** `/api/v1/centers`
* **Định dạng dữ liệu:** `application/json`

#### Request Body:
| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Có** | Tên trung tâm (Độc nhất) |
| `address` | `string` | **Có** | Địa chỉ trung tâm |
| `phone` | `string` | **Có** | Số điện thoại liên hệ |
| `email` | `string` | **Có** | Email liên hệ (phải đúng định dạng) |
| `image` | `string` | Không | URL ảnh đại diện/ảnh bìa chính của trung tâm |
| `images` | `string[]` | Không | **[MỚI]** Mảng chứa danh sách các URL ảnh phụ/chi tiết |
| `mapEmbedUrl` | `string` | Không | Link nhúng Google Map (`<iframe>` src) - Đã validate URL |
| `description`| `string` | Không | Mô tả chi tiết về trung tâm |

#### Ví dụ Request Payload:
```json
{
  "name": "Kata Cầu Giấy",
  "address": "Khúc Thừa Dụ, Dịch Vọng, Cầu Giấy, Hà Nội",
  "phone": "0987654321",
  "email": "caugiay@kata.edu.vn",
  "image": "/uploads/learning/centers/main-cover.jpg",
  "images": [
    "/uploads/learning/centers/classroom-1.jpg",
    "/uploads/learning/centers/classroom-2.jpg",
    "/uploads/learning/centers/lobby.jpg"
  ],
  "mapEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.9244039987483!2d105.79155557597147!3d21.03571058753738!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab3818e38d73%3A0x6bcfd30e5270104f!2zS2jDumMgVGjhu6thIEThu6UsIEPhuqd1IEdp4bqleSwgSMOgIE7hu5lpLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1780000000000!5m2!1svi!2s",
  "description": "Trung tâm Kata cơ sở Cầu Giấy với cơ sở vật chất hiện đại, đầy đủ trang thiết bị."
}
```

---

### B. API Cập Nhật Trung Tâm (Update Center)
* **Phương thức:** `PATCH`
* **Đường dẫn (Endpoint):** `/api/v1/centers/:id`
* **Định dạng dữ liệu:** `application/json`

> [!NOTE]
> Phía Backend xử lý cập nhật danh sách ảnh theo cơ chế **ghi đè hoàn toàn (replace)**. Giao diện Frontend khi gửi danh sách `images` mới lên cần chứa toàn bộ những ảnh muốn giữ lại (bao gồm cả ảnh cũ và ảnh mới thêm). Nếu gửi mảng rỗng `[]`, toàn bộ ảnh phụ của trung tâm đó sẽ bị gỡ bỏ (chuyển trạng thái hoạt động về `isActive = false` trong DB).

#### Ví dụ Request Payload:
```json
{
  "images": [
    "/uploads/learning/centers/classroom-1.jpg", 
    "/uploads/learning/centers/classroom-3-new.jpg"
  ]
}
```

---

### C. Giao thức dữ liệu trả về (Response Payload)
Tất cả API bao gồm lấy danh sách (`GET /centers`), chi tiết (`GET /centers/:id`), tạo mới, cập nhật đều trả về dữ liệu trung tâm kèm theo danh sách ảnh phụ ở trường `images`:

#### Cấu trúc dữ liệu Center nhận về:
```json
{
  "data": {
    "id": "01908ef1-a4b5-7762-b91c-2e65d8a9bc12",
    "name": "Kata Cầu Giấy",
    "address": "Khúc Thừa Dụ, Dịch Vọng, Cầu Giấy, Hà Nội",
    "phone": "0987654321",
    "email": "caugiay@kata.edu.vn",
    "description": "Trung tâm Kata cơ sở Cầu Giấy với cơ sở vật chất hiện đại...",
    "image": "/uploads/learning/centers/main-cover.jpg",
    "mapEmbedUrl": "https://www.google.com/maps/embed?pb=...",
    "isActive": true,
    "createdAt": "2026-07-08T13:37:30.000Z",
    "updatedAt": "2026-07-08T13:40:00.000Z",
    "images": [
      {
        "id": "01908ef1-bc89-7cf3-82a1-12cd4e5f67ab",
        "centerId": "01908ef1-a4b5-7762-b91c-2e65d8a9bc12",
        "url": "/uploads/learning/centers/classroom-1.jpg",
        "orderIndex": 0,
        "isActive": true
      },
      {
        "id": "01908ef1-cd90-7df4-93b2-23de5f6f78cd",
        "centerId": "01908ef1-a4b5-7762-b91c-2e65d8a9bc12",
        "url": "/uploads/learning/centers/classroom-3-new.jpg",
        "orderIndex": 1,
        "isActive": true
      }
    ]
  }
}
```

---

### D. API Kích Hoạt Lại Trung Tâm Bị Inactive (Reactivate Center)
Khi tạo mới trung tâm mà trùng tên với một trung tâm đang bị `inactive` (đã bị xóa trước đó), API Tạo mới sẽ trả về lỗi **409 Conflict** với mã lỗi `DUPLICATE_INACTIVE_RECORD`. Lúc này Frontend có thể gọi API dưới đây để kích hoạt lại trung tâm đó.

* **Phương thức:** `PATCH`
* **Đường dẫn (Endpoint):** `/api/v1/centers/:id/reactivate`
* **Định dạng dữ liệu:** Không yêu cầu Request Body

#### Phản hồi thành công (Response):
Trả về thông tin chi tiết của trung tâm vừa được kích hoạt lại (với `isActive = true`).

---

## 3. Hướng Dẫn Triển Khai Cho Frontend

### Bước 1: Định nghĩa lại Type/Interface `Center`
Trong file quản lý types của frontend (ví dụ: [types/backend.ts](file:///c:/Users/Admin/kt-fe/src/types/backend.ts)):

```typescript
export interface CenterImage {
  id: string;
  centerId: string;
  url: string;
  orderIndex: number;
  isActive: boolean;
}

export interface Center {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  image?: string;         // Ảnh đại diện chính
  images?: CenterImage[]; // [Mới] Danh sách ảnh phụ
  mapEmbedUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCenterRequest extends Omit<Center, "id" | "isActive" | "createdAt" | "updatedAt" | "images"> {
  images?: string[]; // Gửi danh sách URL dạng string[] lên BE
}

export type UpdateCenterRequest = Partial<CreateCenterRequest> & { isActive?: boolean };
```

### Bước 2: Tích hợp Giao diện Upload
* Sử dụng component `<Upload>` của Ant Design với chế độ `multiple` hoặc cho phép chọn nhiều file.
* Khi người dùng chọn file, thực hiện gọi API upload phương tiện của hệ thống để tải ảnh lên server lưu trữ tạm thời và lấy về đường dẫn URL (ví dụ: `/uploads/learning/media-assets/...`).
* Đưa danh sách các URL nhận được vào trạng thái `images` của Form và gửi đi trong request body.

### Bước 3: Xử lý luồng Trùng tên & Kích hoạt lại (Reactivate Flow)
Khi gọi API Tạo mới trung tâm (`POST /centers`), nếu xảy ra lỗi trùng tên với một trung tâm đang bị `inactive`, Backend sẽ trả về mã lỗi HTTP 409 như sau:

#### Chi tiết lỗi 409:
```json
{
  "statusCode": 409,
  "errorCode": "DUPLICATE_INACTIVE_RECORD",
  "message": "Tên trung tâm đã tồn tại nhưng đang bị inactive",
  "details": {
    "resource": "center",
    "id": "01908ef1-a4b5-7762-b91c-2e65d8a9bc12",
    "isActive": false,
    "canReactivate": true,
    "matchedBy": ["name"],
    "reactivateEndpoint": "/api/v1/centers/01908ef1-a4b5-7762-b91c-2e65d8a9bc12/reactivate"
  }
}
```

#### Hướng xử lý ở Frontend:
1. Bọc hàm `handleCenterSubmit` trong khối `try/catch`.
2. Khi bắt được lỗi (`error` dạng `ApiError`), kiểm tra:
   * Nếu `error.statusCode === 409` và `error.errorCode === 'DUPLICATE_INACTIVE_RECORD'`:
   * Lấy ID trung tâm từ `error.details.id` hoặc lấy endpoint kích hoạt từ `error.details.reactivateEndpoint`.
3. Hiển thị một Modal confirm (ví dụ `Modal.confirm` của Ant Design) với thông điệp:
   > *"Tên trung tâm đã tồn tại trong hệ thống nhưng đang ở trạng thái ngừng hoạt động. Bạn có muốn khôi phục lại trung tâm này không?"*
4. Nếu người dùng chọn **"Khôi phục"**:
   * Gọi API `PATCH /api/v1/centers/:id/reactivate` để kích hoạt lại trung tâm đó.
   * Đồng thời cập nhật dữ liệu của trung tâm vừa kích hoạt theo thông tin mới nhất người dùng vừa nhập (gửi tiếp một request `PATCH /api/v1/centers/:id` với dữ liệu form hiện tại nếu cần thiết).
   * Đóng form và tải lại danh sách trung tâm.

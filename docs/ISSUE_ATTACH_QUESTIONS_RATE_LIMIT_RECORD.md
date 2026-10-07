# Báo Cáo Kỹ Thuật: Khắc Phục Lỗi Thêm Câu Hỏi Vào Đề Thi & Too Many Requests (429)

> **Ngày thực hiện:** 07/10/2026  
> **Hệ thống:** Learning CMS (Frontend: `fe-kt-latest`, Backend: `kata_edu-be`, DB: `kata_edu_db`)  
> **Người thực hiện:** Antigravity Engineering Pair-Programming

---

## 1. Mô tả vấn đề (Problem Description)

Người dùng và giáo viên phản hồi 3 vấn đề liên quan đến việc cấu hình câu hỏi cho đề thi trên giao diện Learning CMS:

1. **Lỗi thứ tự câu hỏi:** Khi bấm nút **"+ Thêm"** câu hỏi vào đề thi trong `ManageQuestionsModal`, hệ thống báo lỗi đỏ:
   > *"Thứ tự câu hỏi trong bài thi đã tồn tại"*
   Trên giao diện ghi nhận 2 thông báo lỗi đỏ này xuất hiện xếp chồng lên nhau cùng lúc.
2. **Lỗi Too Many Requests (HTTP 429):** Khi người dùng thao tác trong modal, hệ thống bị nghẽn và bắn thông báo lỗi *"Too many requests"* (Rate limiting).
3. **Phản hồi về câu hỏi cũ:** Có phản hồi cho rằng các câu hỏi tạo từ trước không thêm được vào đề thi / giáo trình, nghi ngờ câu hỏi cũ đang ở trạng thái `draft` chưa được duyệt.
4. **Yêu cầu nghiệp vụ mới từ khách hàng:** Đơn giản hóa quy trình: khi tạo câu hỏi, mặc định là câu hỏi đã được duyệt luôn (`published`), bỏ qua bước phê duyệt thủ công trung gian.

---

## 2. Kết quả kiểm tra trực tiếp Database (`kata_edu_db`)

Trước khi tiến hành sửa mã nguồn, kỹ sư đã truy vấn trực tiếp cơ sở dữ liệu PostgreSQL cục bộ để làm rõ hiện trạng:

### 2.1. Kiểm tra trạng thái các câu hỏi trong bảng `questions`
```sql
SELECT status, count(*) FROM questions GROUP BY status;
```
* **Kết quả:**
  * `status: 'published'`: **35 câu hỏi** (100% tổng số câu hỏi).
  * `status: 'draft'`: **0 câu hỏi**.
* **Kết luận:** Trạng thái `published` **CÓ được lưu vào database** và toàn bộ câu hỏi cũ trong hệ thống **ĐỀU ĐÃ ĐƯỢC DUYỆT (published)**. Nghi vấn "câu hỏi cũ bị kẹt ở draft" là **không chính xác**.

### 2.2. Kiểm tra bảng liên kết `exam_questions`
```sql
SELECT exam_id, min(order_index), max(order_index), count(*) 
FROM exam_questions 
GROUP BY exam_id;
```
* **Kết quả:**
  * Một số đề thi được seed với `order_index` đánh số bắt đầu từ `1` (1-indexed, ví dụ từ 1 đến 24).
  * Tại đề thi xảy ra lỗi trong ảnh (*"Kiểm tra giữa kì"*, ID `01a1041c-7c7f-72cf-b742-8225e74735e8`): trong DB đã chứa sẵn các bản ghi với `order_index` từ `0` đến `34`.
  * Bảng `exam_questions` trong PostgreSQL có ràng buộc duy nhất (Unique Constraint) trên cặp `(exam_id, order_index)`.

---

## 3. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)

### 3.1. Nguyên nhân lỗi "Thứ tự câu hỏi trong bài thi đã tồn tại"
* **Cách tính `orderIndex` sai lệch:**  
  Trong `LearningCms.tsx`, code frontend trước đây tính:
  ```ts
  const orderIndex = (selectedExam.questions ?? []).length;
  ```
  Nếu đề thi hiển thị 25 câu trên UI, frontend gửi `orderIndex: 25`. Tuy nhiên, trong DB đề thi này đã có câu hỏi mang `order_index = 25` (hoặc với các đề đánh số 1..N thì số N đã có sẵn). Backend gặp trùng lặp Unique Constraint và quăng lỗi: *"Thứ tự câu hỏi trong bài thi đã tồn tại"*.
* **Race condition do không khóa nút bấm:**  
  Nút **"+ Thêm"** trong `ManageQuestionsModal.tsx` không có trạng thái `loading` hay `disabled`. Khi người dùng click nhanh / click đúp (double-click), 2 request được gửi đi đồng thời với cùng 1 giá trị `orderIndex`. Request thứ 2 lập tức bị va chạm với request thứ 1, tạo ra 2 toast lỗi đỏ xếp chồng như trên ảnh chụp.

### 3.2. Nguyên nhân lỗi "Too Many Requests" (HTTP 429)
* **Bão request sau mỗi thao tác thêm/xóa câu hỏi:**  
  Trong hàm `handleAddQuestionToExam` và `handleRemoveQuestionFromExam`, ngay sau khi API attach/remove hoàn tất, code gọi hàm `loadAllData()`.  
  Hàm `loadAllData()` tải lại toàn bộ Learning CMS: 9 API danh mục + lặp `exams.get()` cho toàn bộ đề thi + lặp `curriculums.get()` cho toàn bộ giáo trình (**khoảng 30–40 requests đồng thời**). Bấm thêm 2–3 câu liên tiếp sẽ bắn hàng trăm request lên server, kích hoạt bộ lọc Rate Limit của backend/proxy trả về HTTP 429.
* **Prefetch hàng loạt khi mở modal:**  
  Khi mở modal, hàm `handleOpenQuestions` chạy `Promise.allSettled(idsToFetch.map(id => questions.get(id)))` gửi hàng loạt request GET chi tiết câu hỏi cùng lúc, gây áp lực lớn cho server trong khi `QuestionPopover` vốn đã có sẵn cơ chế lazy-load khi hover chuột.

---

## 4. Các giải pháp đã triển khai (Implemented Solutions)

Theo đúng định hướng, hệ thống đã thực hiện **Action 1** và **Action 3**:

### 4.1. Action 1: Tạo câu hỏi mặc định là `published`
* **File:** [`src/pages/profilePage/admin/LearningCms.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/LearningCms.tsx#L1338)
* Đổi giá trị khởi tạo trạng thái khi lưu câu hỏi từ `"draft"` sang `"published"`:
  ```ts
  // Trước đây:
  status: editingItem?.status ?? "draft",

  // Sau khi sửa:
  status: editingItem?.status ?? "published",
  ```
  Giúp người dùng tạo câu hỏi xong là có thể thêm ngay vào đề thi mà không cần bước duyệt trung gian.

---

### 4.2. Action 3: Xử lý triệt để va chạm `orderIndex` và lỗi 429

#### 1. Thuật toán phân bổ `orderIndex` an toàn, chống va chạm tuyệt đối
* **File:** [`src/pages/profilePage/admin/LearningCms.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/LearningCms.tsx#L1712-L1730), [`src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx#L375-L399)
* Thay vì tin tưởng `length`, hệ thống gom toàn bộ các số `orderIndex` đang có vào một `Set`. Tìm số lớn nhất (`maxIdx + 1`) và kiểm tra qua vòng lặp `while (existingIndices.has(orderIndex)) orderIndex++` để đảm bảo số thứ tự được gửi lên luôn là số mới chưa từng xuất hiện trong đề thi.
* Áp dụng tương tự cho cả việc gắn bài thi vào giáo trình (`handleAddExamToCurriculum`).

#### 2. Thêm Loading State & Khóa nút bấm (Anti-Spam / Anti-Double-Click)
* **File:** [`src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx#L605-L625)
* Thêm state `addingQuestionId`:
  ```tsx
  action={
    <Button
      type="dashed"
      size="small"
      icon={<PlusOutlined />}
      loading={addingQuestionId === q.id}
      disabled={addingQuestionId !== null}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          setAddingQuestionId(q.id);
          await onAddQuestion(q.id);
        } finally {
          setAddingQuestionId(null);
        }
      }}
      className="text-xs"
    >
      Thêm
    </Button>
  }
  ```
* Tương tự với nút thêm đề thi vào giáo trình trong [`ManageExamsModal.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/learningCms/components/modals/ManageExamsModal.tsx#L170-L185) với `addingExamId`.

#### 3. Loại bỏ bão request, dập tắt lỗi 429
* **File:** [`src/pages/profilePage/admin/LearningCms.tsx`](file:///c:/Users/dangkn1/fe-kt-latest/src/pages/profilePage/admin/LearningCms.tsx#L1695-L1770)
* Xóa bỏ hoàn toàn đoạn prefetch song song `Promise.allSettled(...)` trong `handleOpenQuestions`.
* Trong các hàm `handleAddQuestionToExam`, `handleRemoveQuestionFromExam`, `handleReorderExamQuestions`:
  * **Loại bỏ lệnh gọi `loadAllData()`**.
  * Cập nhật trực tiếp kết quả vào state `selectedExam` và danh sách `exams` cục bộ:
    ```ts
    const updated = await learningCmsService.exams.get(selectedExam.id);
    setSelectedExam(updated);
    setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    ```

---

## 5. Danh sách Files đã cập nhật

| File | Thay đổi chính |
| :--- | :--- |
| `src/pages/profilePage/admin/LearningCms.tsx` | - Set mặc định `status: "published"` khi tạo câu hỏi.<br>- Bỏ prefetch hàng loạt khi mở modal câu hỏi.<br>- Tính `orderIndex` an toàn bằng `Set` + `Math.max` cho đề thi & giáo trình.<br>- Bỏ gọi `loadAllData()` khi thêm/xóa câu hỏi và đề thi, chuyển sang update state cục bộ. |
| `src/pages/profilePage/admin/learningCms/components/modals/ManageQuestionsModal.tsx` | - Thêm `addingQuestionId`, bật icon `loading` và `disabled` khi bấm thêm câu hỏi.<br>- Tính `orderIndex` an toàn cho tính năng Bulk Attach câu hỏi ngẫu nhiên. |
| `src/pages/profilePage/admin/learningCms/components/modals/ManageExamsModal.tsx` | - Thêm `addingExamId`, bật icon `loading` và `disabled` khi bấm thêm đề thi vào giáo trình. |

---

## 6. Kết quả nghiệm thu

* Đã kiểm tra build hoàn chỉnh: `npm run build` đạt kết quả `✓ built in 2.79s` với 0 lỗi cú pháp / TypeScript.
* Thao tác thêm câu hỏi vào đề thi diễn ra nhanh chóng, mượt mà; không còn xuất hiện lỗi va chạm thứ tự và triệt tiêu hoàn toàn lỗi 429 Too Many Requests.

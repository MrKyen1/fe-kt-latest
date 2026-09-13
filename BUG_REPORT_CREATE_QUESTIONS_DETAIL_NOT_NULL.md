# BÁO CÁO LỖI BACKEND: KHÔNG THỂ TẠO CÂU HỎI CÓ DỮ LIỆU CHI TIẾT (READING COMPREHENSION, WORD ORDERING,...) DO VI PHẠM RÀNG BUỘC NOT NULL CỦA CỘT ID

---

## 1. Tóm tắt vấn đề (Issue Summary)

* **Endpoints bị ảnh hưởng:**
  * `POST /api/v1/learning/questions` (Tạo câu hỏi mới)
  * `PATCH /api/v1/learning/questions/:id` (Cập nhật câu hỏi và chi tiết)
* **Các loại câu hỏi bị ảnh hưởng:**
  * `reading_comprehension` (Đọc hiểu - liên kết bài đọc)
  * `word_ordering` (Sắp xếp từ thành câu)
  * `sentence_rewrite` (Viết lại câu)
  * `hint_rewrite` (Viết lại câu theo từ gợi ý)
  * `error_correction` (Tìm và sửa lỗi sai)
  * `matching` (Nối cặp tương ứng)
  *(Chỉ riêng loại `multiple_choice` là tạo thành công do không có bảng entity detail con)*
* **Hiện tượng:**
  * Khi người dùng (Admin/Teacher) tạo câu hỏi thuộc các loại trên và gửi payload hợp lệ từ Frontend lên Backend, Backend trả về mã lỗi **HTTP 409 Conflict**:
    ```json
    {
      "success": false,
      "statusCode": 409,
      "errorCode": "DATABASE_CONSTRAINT_ERROR",
      "message": "Dữ liệu bị trùng hoặc vi phạm ràng buộc"
    }
    ```
  * Transaction bị `ROLLBACK`, câu hỏi không thể được tạo.

---

## 2. Phân tích nguyên nhân kỹ thuật chi tiết (Root Cause Analysis)

### A. Bản chất lỗi tại cơ sở dữ liệu PostgreSQL
Khi kiểm tra trực tiếp log câu lệnh PostgreSQL và database execution:
```text
QueryFailedError: null value in column "id" of relation "reading_comprehension_questions" violates not-null constraint
code: '23502'
detail: 'Failing row contains (null, 01993fe9-0e7d-75eb-b054-07d4b4a390ba, 0199277a-24cb-741c-b17b-de6cbfa04533).'
table: 'reading_comprehension_questions'
```
Mã lỗi thực sự của PostgreSQL là **`23502` (`not_null_violation`)**, do giá trị của cột `id` bị truyền vào là `null` (hoặc `DEFAULT` nhưng cột `id` không có `DEFAULT` ở mức DDL schema của Postgres).

### B. Cơ chế sinh ID `@Uuidv7PrimaryColumn()` trong TypeORM
Trong backend, tất cả các entity đều sử dụng decorator tuỳ biến:
```typescript
// src/common/decorators/uuidv7-primary-column.decorator.ts
export function Uuidv7PrimaryColumn(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    PrimaryColumn('uuid', { name: 'id' })(target, propertyKey);
    BeforeInsert()(target, 'generateUuidv7Id', {
      value: function () {
        if (!this[propertyKey]) {
          this[propertyKey] = uuidv7();
        }
      },
    });
  };
}
```
* Decorator này gắn một hook `@BeforeInsert()` vào prototype của entity để tự động sinh UUIDv7 khi insert.
* **QUY TẮC QUAN TRỌNG CỦA TYPEORM:** Hook `@BeforeInsert()` **chỉ được kích hoạt** khi đối tượng được lưu là một **Entity Instance** (được khởi tạo qua `repository.create(...)` hoặc `new Entity()`).
* Nếu truyền một **Plain JavaScript Object** `{ questionId: ..., ... }` trực tiếp vào `repository.save(...)`, TypeORM sẽ coi đây là đối tượng thuần, **bỏ qua toàn bộ các lifecycle subscriber/hooks `@BeforeInsert()`**.
* Do đó, trường `id` vẫn là `undefined`. Khi TypeORM sinh câu lệnh `INSERT`, nó không truyền `id`, dẫn đến PostgreSQL ném lỗi `not-null constraint violation (23502)`.

### C. Vị trí mã nguồn gây lỗi trong Backend
* **File:** `src/modules/learning/services/questions.service.ts`
* **Hàm:** `saveDetail` (dòng 732 - 795)
* **Thực trạng:**
  Trong hàm `saveDetail`, toàn bộ các lệnh `save()` cho 7 bảng chi tiết đều truyền object thuần trực tiếp thay vì bọc qua `manager.getRepository(...).create(...)`:
  ```typescript
  // Đoạn mã lỗi hiện tại:
  case QuestionType.WORD_ORDERING:
    await manager.getRepository(WordOrderingQuestion).save({ ... }); // THIẾU .create()
    break;
  case QuestionType.READING_COMPREHENSION:
    await manager.getRepository(ReadingComprehensionQuestion).save({ ... }); // THIẾU .create()
    break;
  case QuestionType.SENTENCE_REWRITE:
    await manager.getRepository(SentenceRewriteQuestion).save({ ... }); // THIẾU .create()
    break;
  case QuestionType.HINT_REWRITE:
    await manager.getRepository(HintRewriteQuestion).save({ ... }); // THIẾU .create()
    break;
  case QuestionType.ERROR_CORRECTION:
    await manager.getRepository(ErrorCorrectionQuestion).save({ ... }); // THIẾU .create()
    break;
  case QuestionType.MATCHING:
    await manager.getRepository(MatchingQuestion).save({ ... }); // THIẾU .create()
    await manager.getRepository(MatchingPair).save((detail.pairs ?? []).map(...)); // THIẾU .create()
    break;
  ```

* **Đối chiếu với các hàm khác trong cùng file:**
  Các phần khác đều đã được viết chuẩn xác bằng cách dùng `.create(...)`:
  * `Question`: `manager.getRepository(Question).save(manager.getRepository(Question).create({ ... }))`
  * `QuestionOption`: `options.map((opt) => manager.getRepository(QuestionOption).create({ ... }))`
  * `QuestionMedia`: `mediaIds.map((m) => manager.getRepository(QuestionMedia).create({ ... }))`
  * `QuestionTag`: `tagIds.map((tagId) => manager.getRepository(QuestionTag).create({ questionId, tagId }))`
  * Duy nhất hàm `saveDetail` bị sót `.create(...)`.

### D. Exception Filter biến đổi lỗi 23502 thành 409
Trong `src/common/filters/all-exceptions.filter.ts`:
```typescript
if (pgCode?.startsWith('23')) {
  return {
    statusCode: HttpStatus.CONFLICT,
    errorCode: 'DATABASE_CONSTRAINT_ERROR',
    message: 'Dữ liệu bị trùng hoặc vi phạm ràng buộc',
  };
}
```
Lớp filter bắt tiền tố `23` (Postgres Class 23 — Integrity Constraint Violation) và ánh xạ sang `409 Conflict`. Điều này khiến lập trình viên tưởng rằng câu hỏi bị trùng dữ liệu (unique constraint 23505), nhưng thực chất là vi phạm NOT NULL (23502).

---

## 3. Điểm sửa chi tiết cho Backend (Diff & Action Items)

### File: `src/modules/learning/services/questions.service.ts`
Sửa phương thức `saveDetail` từ dòng 732 đến 795:

```diff
  private async saveDetail(
    manager: EntityManager,
    questionId: string,
    type: QuestionType,
    detail: QuestionDetail,
  ) {
    switch (type) {
      case QuestionType.WORD_ORDERING:
-       await manager.getRepository(WordOrderingQuestion).save({
+       await manager.getRepository(WordOrderingQuestion).save(
+         manager.getRepository(WordOrderingQuestion).create({
            questionId,
            correctTokens: detail.correctTokens,
            caseSensitive: detail.caseSensitive ?? false,
            allowPunctuationVariants: detail.allowPunctuationVariants ?? true,
-       });
+         }),
+       );
        break;
      case QuestionType.READING_COMPREHENSION:
-       await manager.getRepository(ReadingComprehensionQuestion).save({
+       await manager.getRepository(ReadingComprehensionQuestion).save(
+         manager.getRepository(ReadingComprehensionQuestion).create({
            questionId,
            passageId: detail.passageId,
-       });
+         }),
+       );
        break;
      case QuestionType.SENTENCE_REWRITE:
-       await manager.getRepository(SentenceRewriteQuestion).save({
+       await manager.getRepository(SentenceRewriteQuestion).save(
+         manager.getRepository(SentenceRewriteQuestion).create({
            questionId,
            sourceSentence: detail.sourceSentence,
            acceptedAnswers: detail.acceptedAnswers,
            gradingMode: detail.gradingMode ?? GradingMode.NORMALIZED,
-       });
+         }),
+       );
        break;
      case QuestionType.HINT_REWRITE:
-       await manager.getRepository(HintRewriteQuestion).save({
+       await manager.getRepository(HintRewriteQuestion).save(
+         manager.getRepository(HintRewriteQuestion).create({
            questionId,
            sourceSentence: detail.sourceSentence,
            hintWord: detail.hintWord,
            acceptedAnswers: detail.acceptedAnswers,
            mustUseHint: detail.mustUseHint ?? true,
            gradingMode: detail.gradingMode ?? GradingMode.NORMALIZED,
-       });
+         }),
+       );
        break;
      case QuestionType.ERROR_CORRECTION:
-       await manager.getRepository(ErrorCorrectionQuestion).save({
+       await manager.getRepository(ErrorCorrectionQuestion).save(
+         manager.getRepository(ErrorCorrectionQuestion).create({
            questionId,
            incorrectSentence: detail.incorrectSentence,
            correctSentence: detail.correctSentence,
            errorSpans: detail.errorSpans ?? [],
-       });
+         }),
+       );
        break;
      case QuestionType.MATCHING:
-       await manager.getRepository(MatchingQuestion).save({
+       await manager.getRepository(MatchingQuestion).save(
+         manager.getRepository(MatchingQuestion).create({
            questionId,
            shuffleLeft: detail.shuffleLeft ?? true,
            shuffleRight: detail.shuffleRight ?? true,
-       });
+         }),
+       );
        await manager.getRepository(MatchingPair).save(
-         (detail.pairs ?? []).map((pair: QuestionDetail, index: number) => ({
+         (detail.pairs ?? []).map((pair: QuestionDetail, index: number) =>
+           manager.getRepository(MatchingPair).create({
              questionId,
              leftText: pair.leftText,
              rightText: pair.rightText,
              leftMediaId: pair.leftMediaId,
              rightMediaId: pair.rightMediaId,
              orderIndex: pair.orderIndex ?? index,
-         })),
+           }),
+         ),
        );
        break;
      default:
        break;
    }
  }
```

---

## 4. Lưu ý đồng bộ phía Frontend (Frontend Adjustment)

* Phía Frontend (`src/pages/profilePage/admin/LearningCms.tsx` - hàm `handleQuestionSubmit`):
  Khi cập nhật câu hỏi (`editingItem`), cần bổ sung trường `expectedUpdatedAt: editingItem.updatedAt` vào `updatePayload` để đảm bảo cơ chế Optimistic Concurrency Control hoạt động chính xác theo chuẩn của backend:
  ```typescript
  if (editingItem) {
    const { type, status, ...updatePayload } = payload;
    await learningCmsService.questions.update(editingItem.id, {
      ...updatePayload,
      expectedUpdatedAt: editingItem.updatedAt,
    });
    message.success("Cập nhật câu hỏi thành công");
  }
  ```

---

## 5. Kết quả kiểm thử thực tế sau khi sửa (Verification)

Toàn bộ 7/7 loại câu hỏi đã được kiểm thử trực tiếp trên backend sau khi sửa hàm `saveDetail`:

| STT | Loại câu hỏi (`type`) | Bảng Detail tương ứng | HTTP Status | Kết quả |
|---|---|---|:---:|:---:|
| 1 | `multiple_choice` | *(Không có bảng detail)* | **201 Created** | Thành công (`id: 01a09629-e9f5-7448-8e3f-2c0eb2f9b5b8`) |
| 2 | `reading_comprehension` | `reading_comprehension_questions` | **201 Created** | Thành công (`id: 01a09629-ea5d-774c-889d-5d00260e89ce`) |
| 3 | `word_ordering` | `word_ordering_questions` | **201 Created** | Thành công (`id: 01a09629-eaee-7575-a340-1bc7e92ca483`) |
| 4 | `sentence_rewrite` | `sentence_rewrite_questions` | **201 Created** | Thành công (`id: 01a09629-eb3b-743c-b140-c19048535aaf`) |
| 5 | `hint_rewrite` | `hint_rewrite_questions` | **201 Created** | Thành công (`id: 01a09629-eb9e-71fd-92f3-34aa68ce323b`) |
| 6 | `error_correction` | `error_correction_questions` | **201 Created** | Thành công (`id: 01a09629-ebe2-7123-a0dd-545390b71a0f`) |
| 7 | `matching` | `matching_questions` & `matching_pairs` | **201 Created** | Thành công (`id: 01a09629-ec3b-717c-b447-2347e1604a08`) |

* **Kiểm thử Cập nhật (PATCH /api/v1/learning/questions/:id):**
  * Cập nhật prompt câu hỏi đọc hiểu kèm `expectedUpdatedAt`.
  * Kết quả: **HTTP 200 OK**, `updatedAt` được làm mới và dữ liệu cập nhật chính xác.


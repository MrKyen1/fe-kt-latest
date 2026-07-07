# Báo cáo lỗi: Xóa Kỹ năng (Skill) trả về HTTP 409 (Conflict)

## 1. Mô tả hiện tượng
Khi Admin thực hiện tính năng **Xóa** một Kỹ năng (Skill) tại màn hình Taxonomy, hệ thống báo lỗi **`DELETE http://localhost:5173/api/v1/learning/skills/:id 409 (Conflict)`**.

---

## 2. Nguyên nhân phía Backend
Hành động này bị chặn chủ động bởi logic bảo vệ dữ liệu ở Backend tại [skills.service.ts](file:///C:/Users/Admin/kata_edu-be/src/modules/learning/services/skills.service.ts#L106):
* **Kiểm tra tham chiếu**: Hàm `ensureNotReferenced` kiểm tra xem Kỹ năng này có đang được liên kết với bất kỳ câu hỏi nào đang hoạt động (`isActive = true`) trong cơ sở dữ liệu hay không:
  ```typescript
  private async ensureNotReferenced(id: string) {
    const exists = await this.dataSource.getRepository(Question).exists({
      where: { skillId: id, isActive: true },
    });
    if (exists) {
      throw new ConflictException(
        'Kỹ năng đang được câu hỏi active tham chiếu',
      );
    }
  }
  ```
* **Phản hồi lỗi**: Do tìm thấy câu hỏi tham chiếu, Backend ném ra `ConflictException` (trả về status code `409 (Conflict)` trên API) để bảo toàn tính toàn vẹn dữ liệu của các câu hỏi.

---

## 3. Hướng giải quyết ở phía Quản trị (Không sửa Backend)
Quản trị viên cần thực hiện dọn dẹp các câu hỏi liên kết trước khi xóa Kỹ năng:
1. Vào danh sách câu hỏi (**Questions**), lọc toàn bộ câu hỏi thuộc Kỹ năng cần xóa.
2. Xóa các câu hỏi đó hoặc cập nhật chúng sang Kỹ năng khác.
3. Quay lại danh mục Taxonomy và thực hiện xóa Kỹ năng mong muốn.

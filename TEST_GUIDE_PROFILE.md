# HƯỚNG DẪN KIỂM THỬ (UAT TEST GUIDE) - PHÂN HỆ TRANG CÁ NHÂN (PROFILE)
Hệ thống: **Kata Edu Web Portal**
Đối tượng kiểm thử: **Admin, Teacher, Student**

---

## 📌 HƯỚNG DẪN CHUNG
- **Mục tiêu**: Đảm bảo các tính năng hiển thị thông tin, cập nhật thông tin cá nhân, quản lý học tập, giao bài và phân quyền hoạt động đúng thiết kế và logic nghiệp vụ.
- **Môi trường test**: Môi trường Staging / Local.
- **Yêu cầu chuẩn bị**: Chuẩn bị 03 tài khoản tương ứng với 3 vai trò:
  1. Tài khoản **Học sinh (Student)**
  2. Tài khoản **Giáo viên (Teacher)**
  3. Tài khoản **Quản trị viên (Admin)**

---

## I. TÀI KHOẢN HỌC SINH (STUDENT PROFILE)

Học sinh truy cập vào mục **Trang cá nhân (Profile)** thông qua menu hệ thống. Màn hình của học sinh gồm 3 Tab chức năng chính:

### 1. Tab "Thông tin cá nhân" (Profile)
* **Mục tiêu**: Kiểm tra tính năng hiển thị và cập nhật thông tin cá nhân của học sinh.
* **Các bước thực hiện**:
  1. Đăng nhập bằng tài khoản **Student**.
  2. Click vào **Profile** trên thanh menu/sider.
  3. Kiểm tra xem tên đăng nhập (Mã học sinh) hiển thị đúng và ở trạng thái **Khóa (Disabled - không thể chỉnh sửa)**.
  4. Nhập thông tin cập nhật cho các trường:
     - *Họ và tên (Full Name)*: Nhập chữ tiếng Việt có dấu (Bắt buộc).
     - *Số điện thoại (Phone)*: Nhập số điện thoại hợp lệ.
     - *Email*: Nhập đúng định dạng email (VD: `student@gmail.com`).
     - *Ngày sinh*: Chọn ngày sinh từ ô chọn ngày.
     - *Địa chỉ*: Nhập địa chỉ cụ thể.
  5. Cập nhật ảnh đại diện:
     - Click biểu tượng **Camera** dưới avatar để tải ảnh mới lên.
     - Kiểm tra xem có hiển thị dòng chữ cảnh báo màu cam: *"Ảnh mới chưa được lưu"*.
  6. Click nút **"Lưu thay đổi"**.
* **Kết quả mong đợi**:
  - Hệ thống hiển thị thông báo thành công *"Cập nhật thành công"*.
  - Ảnh đại diện mới được lưu và dòng chữ cảnh báo biến mất.
  - Tải lại trang (F5), các thông tin cá nhân mới cập nhật vẫn được giữ nguyên.

### 2. Tab "Bài học của tôi" (My Exams)
* **Mục tiêu**: Kiểm tra việc hiển thị danh sách bài tập được giao, lịch sử làm bài và tự học giáo trình.
* **Các bước thực hiện**:
  - **Phần 1: Bài học & bài tập được giao (Exam Assignments)**
    1. Click tab **"Bài học của tôi"** -> Chọn tab con **"Bài học & bài tập được giao"**.
    2. Kiểm tra danh sách bài tập hiển thị thông tin: Tên bài, Người giao/Lớp học, Hạn nộp, Tiến độ, Lượt làm tối đa, Điểm số tốt nhất.
    3. Click nút **"Làm bài"** ở một bài tập bất kỳ -> Kiểm tra xem hệ thống có điều hướng vào trang làm bài thi hay không.
    4. Click nút **"Lịch sử"** ở một bài tập đã từng làm:
       - Kiểm tra bảng lịch sử hiện ra các cột: *Lần làm (#1, #2...), Trạng thái (Đã nộp / Đang làm), Điểm số, Phần trăm đúng, Thời gian làm, Ngày nộp*.
       - Với lượt có trạng thái *Đã nộp*: Click **"Xem đáp án"** -> Kiểm tra điều hướng tới trang xem chi tiết bài thi đã làm.
       - Với lượt có trạng thái *Đang làm*: Click **"Tiếp tục"** -> Kiểm tra điều hướng quay lại bài thi để làm tiếp.
  - **Phần 2: Giáo trình tự học (Curriculums)**
    1. Chọn tab con **"Giáo trình tự học"**.
    2. Kiểm tra danh sách Giáo trình tự học đang tham gia hiển thị kèm thanh tiến độ học tập (%).
    3. Click vào giáo trình để mở rộng danh sách bài học/bài thi bên trong.
    4. Kiểm tra các nút hành động **"Làm bài"** hoặc **"Lịch sử"** của từng bài thi tự học hoạt động đúng tương tự phần 1.

### 3. Tab "Bảng xếp hạng" (Ranking)
* **Mục tiêu**: Kiểm tra hiển thị tiến trình của bản thân và Top học sinh xuất sắc.
* **Các bước thực hiện**:
  1. Click tab **"Ranking"**.
  2. Kiểm tra phần **"Your Progress"** (Tiến độ của bạn): Hiển thị đúng Tỷ lệ hoàn thành bài tập (%), Thứ hạng hiện tại trên hệ thống và Điểm số tích lũy (Score).
  3. Kiểm tra phần **"Top 5 Ranking"**: Đảm bảo bảng xếp hạng hiển thị tối đa 5 học sinh xuất sắc nhất (hiển thị Rank, Tên học sinh, Lớp, Điểm số).

---

## II. TÀI KHOẢN GIÁO VIÊN (TEACHER PROFILE)

Giáo viên truy cập vào mục **Trang cá nhân (Profile)**. Màn hình của giáo viên gồm 3 Tab chức năng chính:

### 1. Tab "Thông tin cá nhân" (Profile)
* **Các bước thực hiện & Kết quả mong đợi**: Tương tự như tài khoản Học sinh (kiểm tra xem có hiển thị đúng thông tin cá nhân và lưu thay đổi thành công).

### 2. Tab "Giao bài" (Assignments)
* **Mục tiêu**: Kiểm tra tính năng quản lý bài tập đã giao cho lớp, xem thống kê chi tiết kết quả làm bài của học sinh và gán giáo trình.
* **Các bước thực hiện**:
  - **Phần 1: Bài thi được giao**
    1. Click tab **"Giao bài"** -> Chọn tab con **"Bài thi được giao"**.
    2. Kiểm tra danh sách hiển thị các bài tập đã giao (Tên đề, Lớp, Hạn nộp, Số lượt làm tối đa, Trạng thái hoạt động, Tiến độ nộp bài của cả lớp).
    3. Kiểm tra nút **"Thống kê"** ở một bài thi bất kỳ:
       - Đảm bảo pop-up thống kê mở ra hiển thị các thông tin: *Số học sinh được giao, Số học sinh đã nộp, Tổng số lượt làm, Điểm trung bình, Điểm cao nhất*.
       - Phần *"Thống kê theo câu hỏi"*: Hiển thị tỷ lệ trả lời đúng/sai của từng câu hỏi dạng biểu đồ tiến độ nhỏ.
    4. Kiểm tra nút **"Chi tiết"**: Xem danh sách từng học sinh trong lớp được giao bài, điểm số đạt được, trạng thái làm bài của riêng học sinh đó.
    5. Kiểm tra nút **"Huỷ giao"**: Click hủy và xác nhận -> Trạng thái đợt giao bài đổi thành *"Đã hủy"*.
    6. **Tạo đợt giao bài mới**:
       - Click nút **"Giao bài thi mới"**.
       - Điền form: Chọn Lớp học -> Chọn Bài thi -> Chọn danh sách Học sinh cần giao (mặc định giao cả lớp hoặc có thể tích chọn cụ thể) -> Nhập Ngày bắt đầu, Hạn nộp -> Nhập giới hạn số lượt làm bài (để trống nếu không giới hạn).
       - Click **"Xác nhận"**. Kiểm tra xem bài thi mới giao đã xuất hiện trong danh sách hay chưa.
  - **Phần 2: Giáo trình lớp học**
    1. Click tab con **"Giáo trình lớp học"**.
    2. Xem danh sách giáo trình đã được gán cho các lớp.
    3. Click nút **"Gán giáo trình lớp học"**: Chọn lớp học -> Chọn giáo trình -> Ấn xác nhận. Kiểm tra giáo trình đã hiển thị đúng trong danh sách của lớp đó.

### 3. Tab "Bảng xếp hạng" (Student Ranking)
* **Mục tiêu**: Xem xếp hạng học sinh diện rộng để theo dõi học lực.
* **Các bước thực hiện**:
  1. Click tab **"Student Ranking"**.
  2. Đảm bảo hiển thị đầy đủ danh sách học sinh toàn hệ thống (không bị giới hạn Top 5 như giao diện học sinh) để giáo viên dễ dàng theo dõi.

---

## III. TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN PROFILE)

Admin là vai trò cao nhất, trang cá nhân tích hợp các tính năng vận hành hệ thống:

### 1. Tab "Thông tin cá nhân" (Profile)
* **Các bước thực hiện & Kết quả mong đợi**: Tương tự như học sinh và giáo viên.

### 2. Tab "Dashboard" (Quản lý trung tâm & cơ sở)
* **Mục tiêu**: Kiểm tra tính năng quản lý tổ chức trường học/trung tâm.
* **Các bước thực hiện**:
  1. Click tab **"Dashboard"**.
  2. Thực hiện kiểm tra các phân hệ quản lý:
     - **Quản lý trung tâm (Centers) & Chi nhánh (Branches)**: Thêm mới, chỉnh sửa thông tin trung tâm/chi nhánh, đổi trạng thái hoạt động.
     - **Quản lý Lớp học (Classes)**: Thêm lớp học mới, chọn giáo trình, gán giáo viên chủ nhiệm/giảng dạy.
     - **Quản lý Nhân sự**: Thêm mới/sửa thông tin Giáo viên (Teachers), Nhân viên (Staff), Phụ huynh (Parents).
     - **Quản lý Học sinh (Students)**: Thêm mới học sinh, phân lớp học sinh, cập nhật hồ sơ học sinh.

### 3. Tab "Learning CMS" (Quản lý nội dung học thuật)
* **Mục tiêu**: Kiểm tra hệ thống quản lý học thuật cực kỳ quan trọng của admin.
* **Các bước thực hiện**:
  1. Click tab **"Learning CMS"**.
  2. Lần lượt click test 5 tab con chức năng:
     - **Giáo trình (Curriculums)**: Thêm mới giáo trình, sửa tên/mã giáo trình, liên kết với các Học phần.
     - **Học phần (Modules)**: Quản lý các chương/mô-đun trong giáo trình, thứ tự các học phần.
     - **Bài thi (Exams)**: Tạo mới đề thi/bài kiểm tra, đặt thời gian làm bài (phút), điểm tối đa, cấu hình bài thi thuộc học phần nào.
     - **Câu hỏi (Questions)**: Tạo ngân hàng câu hỏi, chọn định dạng câu hỏi (Trắc nghiệm Single choice, Multiple choice, Điền vào chỗ trống, Đọc hiểu, Nghe...), gán câu hỏi vào bài thi.
     - **Media Assets**: Quản lý tài nguyên đa phương tiện tải lên (hình ảnh, âm thanh bài nghe, video hướng dẫn).

### 4. Tab "Phân quyền (RBAC)"
* **Mục tiêu**: Kiểm tra tính năng phân quyền nhóm tài khoản.
* **Các bước thực hiện**:
  1. Click tab **"Phân quyền (RBAC)"**.
  2. Kiểm tra danh sách vai trò hiện có (Admin, Teacher, Student, v.v.).
  3. Kiểm tra tính năng cập nhật quyền hạn (Permissions) cho từng vai trò và tính năng gán vai trò trực tiếp cho người dùng cụ thể.

### 5. Tab "About" & "Quản lý khóa học"
* **Mục tiêu**: Kiểm tra cập nhật thông tin hiển thị ở trang chủ ngoài (Public).
* **Các bước thực hiện**:
  1. Click tab **"About"**: Cập nhật thông tin giới thiệu trung tâm, tầm nhìn, sứ mệnh, hình ảnh hoạt động. Ấn lưu và kiểm tra xem trang chủ công cộng đã đổi thông tin chưa.
  2. Click **"Admin Courses"**: Quản lý thông tin các khóa học tiêu biểu hiển thị ngoài trang chủ.

---
*Chúc quý khách hàng có trải nghiệm nghiệm thu hệ thống (UAT) thành công tốt đẹp!*
*Nếu phát hiện bất kỳ lỗi hoặc điểm chưa tối ưu nào, vui lòng ghi nhận kèm ảnh chụp màn hình và mô tả các bước thực hiện để đội ngũ kỹ thuật xử lý nhanh nhất.*

# Quy trình giao code lên repo của khách

> File nội bộ của team, **không** được gửi sang repo khách (mọi file `.md` trừ `README_DEPLOYMENT.md` đều bị loại).

## 1. Nguyên tắc

Mỗi dự án có **2 repo GitHub**:

| Remote   | Là gì                               | Chứa gì                                                                         |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `origin` | Repo cá nhân của team               | Toàn bộ lịch sử commit, tài liệu nội bộ, ghi chú, file cấu hình công cụ cá nhân |
| `client` | Repo trong org `kata-edu` của khách | Chỉ code cần bàn giao, mỗi lần giao là 1 commit, **không** có lịch sử cá nhân   |

| Repo | Remote `origin`                               | Remote `client`                        | Người export |
| ---- | --------------------------------------------- | -------------------------------------- | ------------ |
| BE   | `git@github.com:h-a-i-gitHub/kata_edu-be.git` | `git@github.com:kata-edu/kata-api.git` | Dev BE       |
| FE   | `git@github.com:MrKyen1/fe-kt-latest.git`     | `git@github.com:kata-edu/kata-web.git` | Dev FE       |

Quy tắc:

1. Làm việc hằng ngày **chỉ với `origin`**: commit, push, merge như bình thường.
2. Muốn giao code cho khách thì **chỉ dùng `scripts/export-client.sh`**. Tuyệt đối không `git push client <nhánh>`: lệnh đó đẩy cả lịch sử cá nhân sang khách.
3. Mỗi repo khách chỉ **1 người** export (xem bảng trên). Script ghi nhớ trạng thái đồng bộ trên máy người export.
4. Những gì không gửi khách được khai báo trong `.client-exclude` (commit trong repo cá nhân, cả team dùng chung).

## 2. Các file liên quan

| File                       | Vai trò                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.client-exclude`          | Danh sách đường dẫn **không** gửi khách. Mỗi dòng là một mẫu glob: `docs/**` = cả thư mục, `**/*.md` = mọi file `.md`. Dòng bắt đầu bằng `!` = vẫn giữ file đó (ví dụ `!README_DEPLOYMENT.md`). |
| `scripts/export-client.sh` | Lọc code theo `.client-exclude` rồi đẩy sang repo khách. Bản thân script và `.client-exclude` không bao giờ được gửi đi.                                                                        |
| `CLIENT_EXPORT.md`         | File này.                                                                                                                                                                                       |

## 3. Cài đặt lần đầu trên máy (mỗi người làm 1 lần)

Yêu cầu: Linux/macOS hoặc **Git Bash** trên Windows (không chạy trong PowerShell/CMD); tài khoản GitHub đã được mời vào org `kata-edu` và có quyền Write trên repo khách tương ứng; SSH key đã thêm vào GitHub.

```bash
cd <thư mục repo>
git pull                                         # lấy .client-exclude và script mới nhất
git remote add client git@github.com:kata-edu/kata-web.git   # BE: kata-api.git
git remote -v                                    # phải thấy cả origin và client
git ls-remote client                             # không báo lỗi = có quyền truy cập
```

## 4. Giao code lần đầu

```bash
git status                                       # mọi thay đổi cần giao đã được commit
scripts/export-client.sh --dry-run               # xem trước: danh sách file bị loại, số file gửi đi
scripts/export-client.sh --commit "Initial commit"   # tạo commit đã lọc trên máy, CHƯA gửi
git show --stat refs/client-export/pending-main     # xem lại commit sắp gửi
scripts/export-client.sh --push                       # gửi đúng commit đó lên repo khách
```

Kiểm tra trên GitHub repo khách: có 1 commit, không có các file trong danh sách loại trừ.

## 5. Quy trình hằng ngày

```bash
# 1. Làm việc và đẩy lên repo cá nhân
git add <các file>
git commit -m "..."
git push

# 2. Khi cần giao bản mới cho khách
scripts/export-client.sh --pull                  # lấy commit khách tự push (nếu có)
git push                                         # đẩy các commit vừa lấy về lên repo cá nhân
scripts/export-client.sh --dry-run
scripts/export-client.sh --commit "Bản giao: mô tả ngắn thay đổi"
git show --stat refs/client-export/pending-main     # thay đổi so với lần giao trước
scripts/export-client.sh --push
# hoặc gộp 2 bước: scripts/export-client.sh "Bản giao: mô tả ngắn thay đổi"
```

`--commit` chỉ tạo commit trên máy (cất ở `refs/client-export/pending-main`), không đổi nhánh làm việc và không gửi gì. Muốn bỏ commit đang chờ: chạy lại `--commit` (ghi đè) hoặc `git update-ref -d refs/client-export/pending-main`.

Script **chỉ gửi code đã commit** (HEAD của nhánh hiện tại). Code chưa commit sẽ không đi theo và script sẽ in nhắc nhở.

## 6. Các lệnh của script

| Lệnh                                          | Tác dụng                                                                                                  | Có push lên khách?                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `scripts/export-client.sh --dry-run`          | Liệt kê file bị loại, đếm file gửi đi, kiểm tra từ khóa cấm                                               | Không                              |
| `scripts/export-client.sh --commit "message"` | Tạo 1 commit chứa code đã lọc, nối tiếp lịch sử bên khách, cất trên máy chờ gửi                           | Không                              |
| `scripts/export-client.sh --push`             | Gửi commit đã tạo bằng `--commit` lên `client/main`; dừng nếu repo khách đã thay đổi kể từ lúc `--commit` | **Có**                             |
| `scripts/export-client.sh "message"`          | Gộp `--commit` và `--push` trong 1 lệnh                                                                   | **Có**                             |
| `scripts/export-client.sh --pull`             | Lấy các commit mới mà người khác push lên repo khách, áp vào nhánh hiện tại bằng cherry-pick              | Không (chỉ thay đổi repo trên máy) |

Biến môi trường tùy chọn:

| Biến            | Mặc định | Dùng khi                                    |
| --------------- | -------- | ------------------------------------------- |
| `CLIENT_REMOTE` | `client` | Remote repo khách trên máy bạn đặt tên khác |
| `CLIENT_BRANCH` | `main`   | Khách muốn nhận code ở nhánh khác           |

Ví dụ: `CLIENT_REMOTE=khach CLIENT_BRANCH=develop scripts/export-client.sh "..."`.

## 7. Các cơ chế an toàn của script

- **Lọc file:** file trong `.client-exclude` bị loại ở mọi lần giao, kể cả khi chúng có trong repo cá nhân.
- **Kiểm tra từ khóa cấm:** nếu code sắp gửi còn chứa tên công cụ nội bộ (danh sách nằm trong script), script **từ chối** và in tên file. Mở file đó, xóa chỗ nhắc tới (thường là comment), commit lại rồi chạy lại. Không sửa script để bỏ qua bước này.
- **Chống ghi đè:** mỗi lần giao, script thay **toàn bộ** nội dung repo khách bằng code của bạn. Nếu bên khách có người push commit mà bạn chưa lấy về, script **dừng lại** và yêu cầu chạy `--pull` trước, để không làm mất thay đổi của họ.
- **Không giao trùng:** nếu code không đổi so với lần giao trước, script báo "already up to date" và không tạo commit.

## 8. Khi gặp lỗi

| Thông báo                                    | Nguyên nhân                                                                   | Cách xử lý                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `has commits you have not pulled`            | Bên khách có commit mới                                                       | `scripts/export-client.sh --pull`, rồi export lại                                                                                                       |
| `No export/pull recorded on this machine`    | Máy này chưa từng export/pull repo khách (máy mới, hoặc người khác đã export) | Nếu chắc chắn nhánh của bạn đã có đủ thay đổi bên khách, chạy đúng lệnh `git update-ref ...` mà script in ra; nếu không chắc, hỏi người export trước đó |
| `Conflict while applying <commit>`           | Thay đổi bên khách xung đột với code của bạn                                  | Sửa xung đột, `git add <file>`, `git cherry-pick --continue`, rồi chạy lệnh `git update-ref ... && ... --pull` mà script in ra                          |
| `Refusing to export; ... found in:`          | Code còn chứa từ khóa cấm                                                     | Xóa trong các file được liệt kê, commit, chạy lại                                                                                                       |
| `Commit or stash your changes before --pull` | Còn thay đổi chưa commit                                                      | Commit hoặc `git stash` rồi chạy lại                                                                                                                    |
| `Nothing to push`                            | Chưa chạy `--commit`, hoặc commit chờ đã được gửi                             | `scripts/export-client.sh --commit "message"`                                                                                                           |
| `changed since --commit`                     | Có người push lên repo khách sau khi bạn `--commit`                           | `scripts/export-client.sh --pull`, rồi `--commit` lại và `--push`                                                                                       |
| `Permission denied` / `Repository not found` | Chưa có quyền trên repo khách, sai SSH key, hoặc URL repo khách đã đổi        | Kiểm tra lời mời vào org, quyền repo, `git remote -v`                                                                                                   |

## 9. Khi repo khách đổi địa chỉ

Remote `client` chỉ là tên gọi trên máy bạn, trỏ tới một URL. Nếu khách đổi tên repo, đổi tên org hoặc chuyển sang repo mới:

```bash
git remote set-url client git@github.com:<org-moi>/<repo-moi>.git
git ls-remote client
```

- **Đổi tên repo hoặc org trên GitHub:** lịch sử giữ nguyên, script chạy tiếp bình thường. GitHub có tự chuyển hướng URL cũ, nhưng vẫn nên `set-url` cho chắc.
- **Chuyển sang một repo hoàn toàn mới (trống):** lần export đầu tiên tạo lại "Initial commit" như bước 4.
- **Repo mới đã có code do người khác đẩy lên:** script sẽ báo `No export/pull recorded`. Chỉ đánh dấu đồng bộ bằng `git update-ref` khi đã chắc chắn code trong repo đó không có gì cần lấy về.

## 10. Deploy

FE build trên máy dev rồi upload lên VPS (xem `README_DEPLOYMENT.md` trong repo BE, mục 7.3). Repo khách FE không có CI build.

## 11. Những điều không được làm

- `git push client <nhánh>`, `git push --all client`, `git push --mirror client`: đẩy lịch sử cá nhân sang khách.
- Đổi tên hoặc xóa `.client-exclude` / `scripts/export-client.sh`: script cần đúng hai đường dẫn này.
- Sửa script để bỏ qua bước kiểm tra từ khóa hoặc kiểm tra chống ghi đè.
- Hai người cùng export một repo khách.

/**
 * Tiện ích chuẩn hóa chuỗi text có chứa ký tự xuống dòng.
 * Xử lý linh hoạt cả 3 định dạng:
 * 1. Literal '\n' (chuỗi "\\n" do JSON escape hoặc BE lưu chuỗi)
 * 2. Thẻ HTML <br>, <br/>, <br />
 * 3. Ký tự \r\n (CRLF từ Windows)
 */
export function normalizeLineBreaks(text: any): string {
  if (text === undefined || text === null) return "";
  if (typeof text !== "string") return String(text);

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/**
 * Chuẩn hóa chuỗi trước khi gửi lên Backend:
 * - Chuẩn hóa tất cả các kiểu xuống dòng về '\n' chuẩn
 * - Cắt bỏ khoảng trắng thừa đầu/cuối
 */
export function formatTextForBackend(text: any): string {
  if (text === undefined || text === null) return "";
  if (typeof text !== "string") return String(text);

  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

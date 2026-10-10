import { ApiEnvelope } from "../types/api";
import {
  CreateGalleryPayload,
  CreateSlidePayload,
  HomepageData,
  HomepageGalleryItem,
  HomepageMedia,
  HomepageSlide,
  HomepageTeacher,
  ReorderItem,
  UpdateGalleryPayload,
  UpdateHomepageSettingsPayload,
  UpdateSlidePayload,
} from "../types/homepage";
import { subscribeQueryInvalidation } from "./queryCache";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

let publicRequest: Promise<HomepageData> | undefined;
let publicExpiresAt = 0;
const invalidatePublic = () => { publicRequest = undefined; publicExpiresAt = 0; };

subscribeQueryInvalidation("/homepage", invalidatePublic);

export const homepageService = {
  /**
   * Public API: Lấy toàn bộ dữ liệu trang chủ (chỉ gồm slide và gallery active)
   */
  async getPublic(): Promise<HomepageData> {
    if (!publicRequest || Date.now() >= publicExpiresAt) {
      publicExpiresAt = Date.now() + 60_000;
      const request = apiClient.get<ApiEnvelope<HomepageData>>("/homepage").then(unwrapData).catch(error => {
        if (publicRequest === request) invalidatePublic();
        throw error;
      });
      publicRequest = request;
    }
    return publicRequest;
  },

  /**
   * Public API: Lấy danh sách giáo viên công khai cho trang chủ
   */
  async getTeachers(): Promise<HomepageTeacher[]> {
    const response = await apiClient.get<ApiEnvelope<HomepageTeacher[]>>("/homepage/teachers", { params: { page: 1, limit: 8 } });
    return unwrapList(response).data;
  },

  /**
   * Admin API: Lấy toàn bộ cấu hình trang chủ (bao gồm cả slide và gallery inactive)
   */
  async getAdmin(): Promise<HomepageData> {
    const response = await apiClient.get<ApiEnvelope<HomepageData>>("/admin/homepage");
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Admin API: Cập nhật cài đặt singleton (about, facilities, footer)
   */
  async updateSettings(payload: UpdateHomepageSettingsPayload): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage", payload);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  // ==================== MEDIA ====================

  /**
   * Upload ảnh mới cho trang chủ (Site Media)
   */
  async uploadMedia(file: File, altText?: string): Promise<HomepageMedia> {
    const formData = new FormData();
    formData.append("file", file);
    if (altText) {
      formData.append("altText", altText);
    }

    const response = await apiClient.post<ApiEnvelope<HomepageMedia>>(
      "/admin/homepage/media/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Lấy danh sách Site Media
   */
  async listMedia(): Promise<HomepageMedia[]> {
    const response = await apiClient.get<ApiEnvelope<HomepageMedia[]>>("/admin/homepage/media");
    const result = unwrapList(response);
    return result.data || [];
  },

  /**
   * Xóa một media (nếu đang được About, Slider hoặc Gallery dùng sẽ trả về 409)
   */
  async deleteMedia(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/homepage/media/${id}`);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  // ==================== SLIDES ====================

  /**
   * Tạo slide mới (tối đa 8 slide active)
   */
  async createSlide(payload: CreateSlidePayload): Promise<HomepageSlide> {
    const response = await apiClient.post<ApiEnvelope<HomepageSlide>>("/admin/homepage/slides", payload);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Cập nhật thông tin slide
   */
  async updateSlide(id: string, payload: UpdateSlidePayload): Promise<HomepageSlide> {
    const response = await apiClient.patch<ApiEnvelope<HomepageSlide>>(`/admin/homepage/slides/${id}`, payload);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Xóa slide
   */
  async deleteSlide(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/homepage/slides/${id}`);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Sắp xếp lại thứ tự các slide
   */
  async reorderSlides(items: ReorderItem[]): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage/slides/reorder", { items });
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  // ==================== GALLERY ====================

  /**
   * Tạo ảnh gallery mới (tối đa 4 ảnh active)
   */
  async createGalleryItem(payload: CreateGalleryPayload): Promise<HomepageGalleryItem> {
    const response = await apiClient.post<ApiEnvelope<HomepageGalleryItem>>("/admin/homepage/gallery", payload);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Cập nhật ảnh gallery
   */
  async updateGalleryItem(id: string, payload: UpdateGalleryPayload): Promise<HomepageGalleryItem> {
    const response = await apiClient.patch<ApiEnvelope<HomepageGalleryItem>>(`/admin/homepage/gallery/${id}`, payload);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Xóa ảnh gallery
   */
  async deleteGalleryItem(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/homepage/gallery/${id}`);
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },

  /**
   * Sắp xếp lại thứ tự ảnh gallery
   */
  async reorderGallery(items: ReorderItem[]): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage/gallery/reorder", { items });
    if (["post", "patch", "delete"].includes(response.config.method ?? "")) invalidatePublic();
    return unwrapData(response);
  },
};

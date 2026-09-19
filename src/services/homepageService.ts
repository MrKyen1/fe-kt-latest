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
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export const homepageService = {
  /**
   * Public API: Lấy toàn bộ dữ liệu trang chủ (chỉ gồm slide và gallery active)
   */
  async getPublic(): Promise<HomepageData> {
    const response = await apiClient.get<ApiEnvelope<HomepageData>>("/homepage");
    return unwrapData(response);
  },

  /**
   * Public API: Lấy danh sách giáo viên công khai cho trang chủ
   */
  async getTeachers(): Promise<HomepageTeacher[]> {
    const response = await apiClient.get<ApiEnvelope<HomepageTeacher[]>>("/homepage/teachers");
    return unwrapData(response);
  },

  /**
   * Admin API: Lấy toàn bộ cấu hình trang chủ (bao gồm cả slide và gallery inactive)
   */
  async getAdmin(): Promise<HomepageData> {
    const response = await apiClient.get<ApiEnvelope<HomepageData>>("/admin/homepage");
    return unwrapData(response);
  },

  /**
   * Admin API: Cập nhật cài đặt singleton (about, facilities, footer)
   */
  async updateSettings(payload: UpdateHomepageSettingsPayload): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage", payload);
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
    return unwrapData(response);
  },

  // ==================== SLIDES ====================

  /**
   * Tạo slide mới (tối đa 8 slide active)
   */
  async createSlide(payload: CreateSlidePayload): Promise<HomepageSlide> {
    const response = await apiClient.post<ApiEnvelope<HomepageSlide>>("/admin/homepage/slides", payload);
    return unwrapData(response);
  },

  /**
   * Cập nhật thông tin slide
   */
  async updateSlide(id: string, payload: UpdateSlidePayload): Promise<HomepageSlide> {
    const response = await apiClient.patch<ApiEnvelope<HomepageSlide>>(`/admin/homepage/slides/${id}`, payload);
    return unwrapData(response);
  },

  /**
   * Xóa slide
   */
  async deleteSlide(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/homepage/slides/${id}`);
    return unwrapData(response);
  },

  /**
   * Sắp xếp lại thứ tự các slide
   */
  async reorderSlides(items: ReorderItem[]): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage/slides/reorder", { items });
    return unwrapData(response);
  },

  // ==================== GALLERY ====================

  /**
   * Tạo ảnh gallery mới (tối đa 4 ảnh active)
   */
  async createGalleryItem(payload: CreateGalleryPayload): Promise<HomepageGalleryItem> {
    const response = await apiClient.post<ApiEnvelope<HomepageGalleryItem>>("/admin/homepage/gallery", payload);
    return unwrapData(response);
  },

  /**
   * Cập nhật ảnh gallery
   */
  async updateGalleryItem(id: string, payload: UpdateGalleryPayload): Promise<HomepageGalleryItem> {
    const response = await apiClient.patch<ApiEnvelope<HomepageGalleryItem>>(`/admin/homepage/gallery/${id}`, payload);
    return unwrapData(response);
  },

  /**
   * Xóa ảnh gallery
   */
  async deleteGalleryItem(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiEnvelope<{ id: string }>>(`/admin/homepage/gallery/${id}`);
    return unwrapData(response);
  },

  /**
   * Sắp xếp lại thứ tự ảnh gallery
   */
  async reorderGallery(items: ReorderItem[]): Promise<HomepageData> {
    const response = await apiClient.patch<ApiEnvelope<HomepageData>>("/admin/homepage/gallery/reorder", { items });
    return unwrapData(response);
  },
};

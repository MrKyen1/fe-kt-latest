import { ApiEnvelope } from "../types/api";
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserListQuery,
} from "../types/backend";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export function mapUserResponse(user: any): User {
  if (!user) return user;
  const mapped = { ...user };
  if (user.teacher) {
    const allClasses = (user.teacher.classes || []).map((c: any) => c.class).filter(Boolean);
    const activeClasses = (user.teacher.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.class)
      .filter(Boolean);
    const allClassesIds = (user.teacher.classes || []).map((c: any) => c.classId).filter(Boolean);
    const activeClassIds = (user.teacher.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.classId)
      .filter(Boolean);

    const allSpecs = (user.teacher.teacherSpecializations || []).map((s: any) => s.specialization).filter(Boolean);
    const activeSpecs = (user.teacher.teacherSpecializations || [])
      .filter((s: any) => s.isActive)
      .map((s: any) => s.specialization)
      .filter(Boolean);
    const allSpecIds = (user.teacher.teacherSpecializations || []).map((s: any) => s.specializationId).filter(Boolean);
    const activeSpecIds = (user.teacher.teacherSpecializations || [])
      .filter((s: any) => s.isActive)
      .map((s: any) => s.specializationId)
      .filter(Boolean);

    // Fallback: If user is inactive or has no active classes, retain historical classes for dashboard/center association
    const resolvedClasses = activeClasses.length > 0 ? activeClasses : allClasses;
    const resolvedClassIds = activeClassIds.length > 0 ? activeClassIds : allClassesIds;
    const resolvedSpecs = activeSpecs.length > 0 ? activeSpecs : allSpecs;
    const resolvedSpecIds = activeSpecIds.length > 0 ? activeSpecIds : allSpecIds;

    mapped.teacherProfile = {
      id: user.teacher.id,
      yearsOfExperience: user.teacher.yearsOfExperience ?? 0,
      description: user.teacher.description,
      bankAccountNumber: user.teacher.bankAccountNumber,
      bankName: user.teacher.bankName,
      insuranceStartDate: user.teacher.insuranceStartDate,
      employmentType: user.teacher.employmentType,
      degrees: user.teacher.degrees || [],
      classIds: resolvedClassIds,
      specializationIds: resolvedSpecIds,
      classes: resolvedClasses,
      specializations: resolvedSpecs,
    };
  }
  if (user.student) {
    const allClasses = (user.student.classes || []).map((c: any) => c.class).filter(Boolean);
    const activeClasses = (user.student.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.class)
      .filter(Boolean);
    const allClassesIds = (user.student.classes || []).map((c: any) => c.classId).filter(Boolean);
    const activeClassIds = (user.student.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.classId)
      .filter(Boolean);

    const resolvedClasses = activeClasses.length > 0 ? activeClasses : allClasses;
    const resolvedClassIds = activeClassIds.length > 0 ? activeClassIds : allClassesIds;

    mapped.studentProfile = {
      id: user.student.id,
      birthYear: user.student.birthYear ?? (user.studentProfile as any)?.birthYear,
      parentFullName: user.student.parentFullName,
      classIds: resolvedClassIds,
      classes: resolvedClasses,
    };
  }

  // Derive all associated centerIds from teacher / student classes
  const teacherCenterIds = (user.teacher?.classes || [])
    .map((c: any) => c.class?.centerId || c.class?.center?.id)
    .filter(Boolean);
  const studentCenterIds = (user.student?.classes || [])
    .map((c: any) => c.class?.centerId || c.class?.center?.id)
    .filter(Boolean);
  const allCenterIds = Array.from(new Set([...teacherCenterIds, ...studentCenterIds]));

  if (allCenterIds.length > 0) {
    mapped.centerIds = allCenterIds;
  }

  // Preserve primary centerId if present in class entity hierarchy
  if (!mapped.centerId) {
    mapped.centerId = allCenterIds[0] || undefined;
  }

  return mapped;
}

export const userService = {
  async provisioningRoles(): Promise<Array<{ id: string; code: string; name: string }>> {
    return unwrapData(await apiClient.get<ApiEnvelope<Array<{ id: string; code: string; name: string }>>>("/users/provisioning-roles"));
  },
  async studentRole(): Promise<{ id: string; code: string; name: string }> {
    return unwrapData(await apiClient.get<ApiEnvelope<{ id: string; code: string; name: string }>>("/users/student-role"));
  },
  async create(payload: CreateUserRequest): Promise<User> {
    const data = unwrapData(await apiClient.post<ApiEnvelope<User>>("/users", payload));
    return mapUserResponse(data);
  },

  async list(params?: UserListQuery): Promise<User[]> {
    const queryParams: any = { limit: 100, ...params };
    // BE trả về paginated response { data: [...], meta: {...} }
    // unwrapList lấy cả data và meta, ta chỉ cần data array
    const result = unwrapList(await apiClient.get<ApiEnvelope<User[]>>("/users", { params: queryParams }));
    return (result.data || []).map(mapUserResponse);
  },

  async get(id: string): Promise<User> {
    const data = unwrapData(await apiClient.get<ApiEnvelope<User>>(`/users/${id}`));
    return mapUserResponse(data);
  },

  async update(id: string, payload: UpdateUserRequest): Promise<User> {
    const data = unwrapData(await apiClient.patch<ApiEnvelope<User>>(`/users/${id}`, payload));
    return mapUserResponse(data);
  },

  async remove(id: string): Promise<User> {
    const data = unwrapData(await apiClient.delete<ApiEnvelope<User>>(`/users/${id}`));
    return mapUserResponse(data);
  },

  async uploadTeacherDegreeImages(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    const response = await apiClient.post<ApiEnvelope<string[]>>(
      "/users/teacher-degree-images/upload/multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return unwrapData(response);
  },

  async exportStudents(filters?: StudentExportFilters, signal?: AbortSignal): Promise<void> {
    const params: Record<string, any> = {};
    if (filters) {
      const allowed: (keyof StudentExportFilters)[] = [
        "search",
        "code",
        "phone",
        "email",
        "isActive",
        "classId",
        "centerId",
        "specializationId",
      ];
      for (const key of allowed) {
        const val = filters[key];
        if (val !== undefined && val !== null && val !== "") {
          params[key] = val;
        }
      }
    }

    try {
      const response = await apiClient.get("/users/students/export", {
        params,
        responseType: "blob",
        timeout: 11 * 60 * 1000,
        signal,
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "danh-sach-hoc-sinh.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 60_000);
    } catch (error: any) {
      if (error?.name === "CanceledError" || error?.name === "AbortError") {
        throw error;
      }
      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          const message = Array.isArray(json?.message)
            ? json.message.join("; ")
            : json?.message;
          if (message) {
            throw new Error(message);
          }
        } catch (e: any) {
          if (e instanceof Error && e.message && e.message !== error.message) {
            throw e;
          }
        }
      }
      throw error;
    }
  },
};

export interface StudentExportFilters {
  search?: string;
  code?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  classId?: string;
  centerId?: string;
  specializationId?: string;
}

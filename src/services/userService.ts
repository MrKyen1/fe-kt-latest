import { ApiEnvelope } from "../types/api";
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserListQuery,
} from "../types/backend";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

function mapUserResponse(user: any): User {
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
      parentFullName: user.student.parentFullName,
      classIds: resolvedClassIds,
      classes: resolvedClasses,
    };
  }

  // Preserve centerId if present in class entity hierarchy
  if (!mapped.centerId) {
    const classWithCenter =
      (user.teacher?.classes || []).find((c: any) => c.class?.centerId || c.class?.center?.id) ||
      (user.student?.classes || []).find((c: any) => c.class?.centerId || c.class?.center?.id);
    if (classWithCenter) {
      mapped.centerId = classWithCenter.class?.centerId || classWithCenter.class?.center?.id;
    }
  }

  return mapped;
}

export const userService = {
  async create(payload: CreateUserRequest): Promise<User> {
    const data = unwrapData(await apiClient.post<ApiEnvelope<User>>("/users", payload));
    return mapUserResponse(data);
  },

  async list(params?: UserListQuery): Promise<User[]> {
    // BE trả về paginated response { data: [...], meta: {...} }
    // unwrapList lấy cả data và meta, ta chỉ cần data array
    const result = unwrapList(await apiClient.get<ApiEnvelope<User[]>>("/users", { params }));
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
};

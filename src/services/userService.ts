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
    const activeClasses = (user.teacher.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.class);
    const activeSpecs = (user.teacher.teacherSpecializations || [])
      .filter((s: any) => s.isActive)
      .map((s: any) => s.specialization);

    mapped.teacherProfile = {
      id: user.teacher.id,
      yearsOfExperience: user.teacher.yearsOfExperience ?? 0,
      description: user.teacher.description,
      bankAccountNumber: user.teacher.bankAccountNumber,
      bankName: user.teacher.bankName,
      insuranceStartDate: user.teacher.insuranceStartDate,
      employmentType: user.teacher.employmentType,
      degrees: user.teacher.degrees || [],
      classIds: (user.teacher.classes || [])
        .filter((c: any) => c.isActive)
        .map((c: any) => c.classId),
      specializationIds: (user.teacher.teacherSpecializations || [])
        .filter((s: any) => s.isActive)
        .map((s: any) => s.specializationId),
      classes: activeClasses,
      specializations: activeSpecs,
    };
  }
  if (user.student) {
    const activeClasses = (user.student.classes || [])
      .filter((c: any) => c.isActive)
      .map((c: any) => c.class);

    mapped.studentProfile = {
      id: user.student.id,
      parentFullName: user.student.parentFullName,
      classIds: (user.student.classes || [])
        .filter((c: any) => c.isActive)
        .map((c: any) => c.classId),
      classes: activeClasses,
    };
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

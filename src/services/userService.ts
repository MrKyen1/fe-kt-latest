import { ApiEnvelope } from "../types/api";
import {
  CreateUserRequest,
  UpdateUserRequest,
  User,
  UserListQuery,
} from "../types/backend";
import { apiClient, unwrapData } from "./apiClient";

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
    const data = unwrapData(await apiClient.get<ApiEnvelope<User[]>>("/users", { params }));
    return (data || []).map(mapUserResponse);
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
};

import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
  Upload,
  Image,
} from "antd";
import type { UploadFile } from "antd";

import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  HomeOutlined,
  KeyOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  MailOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  UploadOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

import { userService } from "../../../services/userService";
import { rbacService } from "../../../services/rbacService";
import { authService } from "../../../services/authService";
import { useAuth } from "../../../contexts/AuthContext";
import { academicService } from "../../../services/academicService";
import { learningCmsService } from "../../../services/learningCmsService";
import { teacherLearningService } from "../../../services/teacherLearningService";
import { resolveMediaUrl } from "../../../services/apiClient";
import { SecureImage } from "../../../components/SecureImage";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

interface TeacherFormValues {
  code: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleId: string;
  password?: string;
  dateOfBirth?: dayjs.Dayjs;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  address?: string;
  yearsOfExperience?: number;
  description: string;
  centerId?: string;
  classIds: string[];
  specializationIds: string[];
}

interface StudentFormValues {
  code: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleId: string;
  password?: string;
  dateOfBirth?: dayjs.Dayjs;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  address?: string;
  centerId?: string;
  classIds: string[];
}

export default function CenterManagement() {
  const { user } = useAuth();

  // ================= DATA STATE =================
  const [centers, setCenters] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [classCurriculums, setClassCurriculums] = useState<any[]>([]);

  // ================= UI STATE =================
  const [loading, setLoading] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [subImagesFileList, setSubImagesFileList] = useState<UploadFile[]>([]);

  // Search state
  const [centerSearch, setCenterSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  // ================= MODAL STATE =================
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [specializationModalOpen, setSpecializationModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Dynamic filter state for modal inputs
  const [selectedModalCenterId, setSelectedModalCenterId] = useState<string | undefined>(undefined);

  // ================= FORMS =================
  const [centerForm] = Form.useForm();
  const [classForm] = Form.useForm();
  const [teacherForm] = Form.useForm<TeacherFormValues>();
  const [studentForm] = Form.useForm<StudentFormValues>();
  const [adminForm] = Form.useForm();
  const [specializationForm] = Form.useForm();

  // ================= EDIT/DELETE STATE =================
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editingSpecialization, setEditingSpecialization] = useState<any>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);

  // ================= EFFECTS =================
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        centersData,
        classesData,
        activeTeachers,
        inactiveTeachers,
        activeStudents,
        inactiveStudents,
        activeAdmins,
        inactiveAdmins,
        rolesData,
        specializationsData,
        curriculumsData,
        classCurriculumsData,
      ] = await Promise.all([
        academicService.centers.list(),
        academicService.classes.list(),
        userService.list({ roleCode: "teacher", isActive: true }),
        userService.list({ roleCode: "teacher", isActive: false }),
        userService.list({ roleCode: "student", isActive: true }),
        userService.list({ roleCode: "student", isActive: false }),
        userService.list({ roleCode: "admin", isActive: true }),
        userService.list({ roleCode: "admin", isActive: false }),
        rbacService.roles.list(),
        academicService.specializations.list(),
        learningCmsService.curriculums.list({ status: "published", limit: 100 }),
        teacherLearningService.classCurriculums.list({ limit: 100 }),
      ]);

      setCenters(centersData || []);
      setClasses(classesData || []);
      setCurriculums(curriculumsData?.data || []);
      setClassCurriculums(classCurriculumsData?.data || []);

      const rawTeachers = [...(activeTeachers || []), ...(inactiveTeachers || [])];
      const uniqueTeachers = rawTeachers.filter(
        (teacher, index, self) => self.findIndex((t) => t.id === teacher.id) === index
      );
      setTeachers(uniqueTeachers);

      const rawStudents = [...(activeStudents || []), ...(inactiveStudents || [])];
      const uniqueStudents = rawStudents.filter(
        (student, index, self) => self.findIndex((s) => s.id === student.id) === index
      );
      setStudents(uniqueStudents);

      const rawAdmins = [...(activeAdmins || []), ...(inactiveAdmins || [])];
      const uniqueAdmins = rawAdmins.filter(
        (admin, index, self) => self.findIndex((a) => a.id === admin.id) === index
      );
      setAdmins(uniqueAdmins);

      setRoles(rolesData || []);
      setSpecializations(specializationsData || []);

      // Autoselect the first center on load if not selected already
      if (centersData && centersData.length > 0 && !selectedCenterId) {
        setSelectedCenterId(centersData[0].id);
      }
    } catch (err) {
      message.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const getTeacherRoleId = () => roles.find((r) => r.code === "teacher")?.id || "";
  const getStudentRoleId = () => roles.find((r) => r.code === "student")?.id || "";
  const getAdminRoleId = () => roles.find((r) => r.code === "admin")?.id || "";

  const isUserActive = (record: any) => {
    if (!record) return false;
    if (record.isActive === false) return false;
    if (record.endDate) {
      return dayjs(record.endDate).isAfter(dayjs());
    }
    return true;
  };

  // ================= CENTER CRUD HANDLERS =================
  const getRelativeUrl = (file: UploadFile) => {
    if (file.response?.url) {
      return file.response.url;
    }
    if (file.url) {
      if (file.url.startsWith("http")) {
        try {
          const parsed = new URL(file.url);
          if (parsed.pathname.startsWith("/uploads")) {
            return parsed.pathname;
          }
        } catch { }
      }
      return file.url;
    }
    return "";
  };

  const handleUploadChange = ({ fileList }: { fileList: UploadFile[] }) => {
    const cappedList = fileList.slice(0, 20);
    const updated = cappedList.map((file) => {
      if (!file.url && file.originFileObj) {
        const previewUrl = URL.createObjectURL(file.originFileObj);
        file.url = previewUrl;
        file.thumbUrl = previewUrl;
      }
      return file;
    });
    setSubImagesFileList(updated);
  };

  const handleCenterCreate = () => {
    setEditingCenter(null);
    setSubImagesFileList([]);
    centerForm.resetFields();
    setCenterModalOpen(true);
  };

  const handleCenterEdit = (record: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering selectedCenterId change
    setEditingCenter(record);

    // Populate Auxiliary/Sub Images File List
    if (record.images && Array.isArray(record.images)) {
      setSubImagesFileList(
        record.images.map((img: any, idx: number) => ({
          uid: img.id || `-${idx + 2}`,
          name: img.url.split("/").pop() || `image-${idx}.png`,
          status: "done",
          url: resolveMediaUrl(img.url),
          thumbUrl: resolveMediaUrl(img.url),
          response: { url: img.url },
        }))
      );
    } else {
      setSubImagesFileList([]);
    }

    centerForm.setFieldsValue({
      name: record.name,
      address: record.address,
      phone: record.phone,
      email: record.email,
      description: record.description,
      image: record.image,
      mapEmbedUrl: record.mapEmbedUrl,
    });
    setCenterModalOpen(true);
  };

  const handleCenterDelete = (record: any, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: "Xóa trung tâm",
      content: `Bạn có chắc muốn xóa trung tâm ${record.name}? Các lớp học thuộc trung tâm này sẽ bị ảnh hưởng.`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await academicService.centers.remove(record.id);
          message.success("Xóa trung tâm thành công");
          if (selectedCenterId === record.id) {
            setSelectedCenterId(null);
          }
          loadData();
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleCenterSubmit = async (values: any) => {
    setLoading(true);
    let payload: any = null;
    try {
      const subImgUrls: string[] = [];

      for (const file of subImagesFileList) {
        if (file.originFileObj) {
          // This is a newly added local file, upload it now
          try {
            const media = await learningCmsService.mediaAssets.upload(file.originFileObj, file.name);
            subImgUrls.push(media.url);
          } catch (uploadErr: any) {
            message.error(`Tải ảnh ${file.name} lên thất bại: ${uploadErr.message || uploadErr}`);
            setLoading(false);
            return;
          }
        } else {
          // This is an existing file, retrieve its relative URL path
          const relUrl = getRelativeUrl(file);
          if (relUrl) {
            subImgUrls.push(relUrl);
          }
        }
      }

      payload = {
        ...values,
        image: null,
        images: subImgUrls,
      };

      const doSubmit = async () => {
        if (editingCenter) {
          await academicService.centers.update(editingCenter.id, payload);
          message.success("Cập nhật trung tâm thành công");
        } else {
          await academicService.centers.create(payload);
          message.success("Tạo trung tâm thành công");
        }
        loadData();
        setCenterModalOpen(false);
        centerForm.resetFields();
      };

      await doSubmit();
    } catch (err: any) {
      if (err.statusCode === 409 && err.errorCode === "DUPLICATE_INACTIVE_RECORD") {
        const centerId = err.details?.id;
        if (centerId) {
          Modal.confirm({
            title: "Khôi phục trung tâm",
            content: "Tên trung tâm đã tồn tại trong hệ thống nhưng đang ở trạng thái ngừng hoạt động. Bạn có muốn khôi phục lại trung tâm này không?",
            okText: "Khôi phục",
            cancelText: "Hủy bỏ",
            onOk: async () => {
              try {
                // 1. Reactivate
                await academicService.centers.reactivate(centerId);
                // 2. Update with current form details
                await academicService.centers.update(centerId, payload);
                message.success("Khôi phục và cập nhật trung tâm thành công");

                loadData();
                setSelectedCenterId(centerId);
                setCenterModalOpen(false);
                centerForm.resetFields();
              } catch (reactivateErr: any) {
                if (reactivateErr.fieldErrors) {
                  const fields = Object.entries(reactivateErr.fieldErrors).map(([key, val]) => ({
                    name: key,
                    errors: Array.isArray(val) ? val : [val],
                  }));
                  centerForm.setFields(fields);
                } else {
                  message.error(reactivateErr.message || "Khôi phục thất bại");
                }
              }
            },
          });
          return;
        }
      }
      if (err.fieldErrors) {
        const fields = Object.entries(err.fieldErrors).map(([key, val]) => ({
          name: key,
          errors: Array.isArray(val) ? val : [val],
        }));
        centerForm.setFields(fields);
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= CLASS CRUD HANDLERS =================
  const handleClassCreate = () => {
    setEditingClass(null);
    classForm.resetFields();
    if (selectedCenterId) {
      classForm.setFieldsValue({ centerId: selectedCenterId });
    }
    setClassModalOpen(true);
  };

  const handleClassEdit = (record: any) => {
    setEditingClass(record);
    const mapped = classCurriculums.filter((cc) => cc.classId === record.id);
    classForm.setFieldsValue({
      name: record.name,
      centerId: record.centerId,
      specializationId: record.specializationId,
      description: record.description,
      curriculumIds: mapped.map((m) => m.curriculumId),
    });
    setClassModalOpen(true);
  };

  const handleClassDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa lớp học",
      content: `Bạn có chắc muốn xóa lớp học ${record.name}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await academicService.classes.remove(record.id);
          message.success("Xóa lớp học thành công");
          loadData();
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const syncClassCurriculums = async (classId: string, targetCurriculumIds: string[]) => {
    const currentMappings = classCurriculums.filter((cc) => cc.classId === classId);
    const currentIds = currentMappings.map((m) => m.curriculumId);
    const nextIds = targetCurriculumIds || [];

    // Create new mappings
    for (const id of nextIds) {
      if (!currentIds.includes(id)) {
        try {
          await teacherLearningService.classCurriculums.create({
            classId,
            curriculumId: id,
          });
        } catch (err) {
          console.error(`Failed to map curriculum ${id}:`, err);
        }
      }
    }

    // Remove old mappings
    for (const mapping of currentMappings) {
      if (!nextIds.includes(mapping.curriculumId)) {
        try {
          await teacherLearningService.classCurriculums.remove(mapping.id);
        } catch (err) {
          console.error(`Failed to remove curriculum map ${mapping.id}:`, err);
        }
      }
    }
  };

  const handleClassSubmit = async (values: any) => {
    const { curriculumIds, specializationId, ...classValues } = values;
    try {
      let savedClass: any = null;
      if (editingClass) {
        savedClass = await academicService.classes.update(editingClass.id, classValues);
        await syncClassCurriculums(editingClass.id, curriculumIds);
        message.success("Cập nhật lớp học thành công");
      } else {
        savedClass = await academicService.classes.create({
          ...classValues,
          specializationId,
        });
        if (savedClass?.id) {
          await syncClassCurriculums(savedClass.id, curriculumIds);
        }
        message.success("Tạo lớp học thành công");
      }
      loadData();
      setClassModalOpen(false);
      classForm.resetFields();
    } catch (err: any) {
      if (err.statusCode === 409 && err.errorCode === "DUPLICATE_INACTIVE_RECORD") {
        const classId = err.details?.id;
        if (classId) {
          Modal.confirm({
            title: "Khôi phục lớp học",
            content: "Tên lớp học đã tồn tại trong trung tâm này nhưng đang ở trạng thái ngừng hoạt động. Bạn có muốn khôi phục lại lớp học này không?",
            okText: "Khôi phục",
            cancelText: "Hủy bỏ",
            onOk: async () => {
              try {
                // 1. Reactivate
                await academicService.classes.reactivate(classId);
                // 2. Update with current form details
                await academicService.classes.update(classId, classValues);
                // 3. Sync curriculum mapping
                await syncClassCurriculums(classId, curriculumIds);

                message.success("Khôi phục và cập nhật lớp học thành công");

                loadData();
                setClassModalOpen(false);
                classForm.resetFields();
              } catch (reactivateErr: any) {
                if (reactivateErr.fieldErrors) {
                  const fields = Object.entries(reactivateErr.fieldErrors).map(([key, val]) => ({
                    name: key,
                    errors: Array.isArray(val) ? val : [val],
                  }));
                  classForm.setFields(fields);
                } else {
                  message.error(reactivateErr.message || "Khôi phục thất bại");
                }
              }
            },
          });
          return;
        }
      }
      if (err.fieldErrors) {
        const fields = Object.entries(err.fieldErrors).map(([key, val]) => ({
          name: key,
          errors: Array.isArray(val) ? val : [val],
        }));
        classForm.setFields(fields);
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    }
  };

  // ================= TEACHER HANDLERS =================
  const handleTeacherCreate = () => {
    setEditingTeacher(null);
    setSelectedModalCenterId(selectedCenterId || undefined);
    teacherForm.resetFields();
    teacherForm.setFieldsValue({
      startDate: dayjs(),
      ...(selectedCenterId && { centerId: selectedCenterId }),
      degrees: [],
    });
    setTeacherModalOpen(true);
  };

  const handleTeacherEdit = (record: any) => {
    setEditingTeacher(record);
    const profile = record.teacherProfile || {};
    const classIds = profile.classes?.map((c: any) => c.id) || profile.classIds || [];
    const specIds = profile.specializations?.map((s: any) => s.id) || profile.specializationIds || [];

    // Auto-detect center based on classes
    const matchedClass = classes.find((c) => classIds.includes(c.id));
    const initialCenterId = matchedClass?.centerId || record.centerId || undefined;

    setSelectedModalCenterId(initialCenterId);

    // Map degrees for Upload component
    const mappedDegrees = (profile.degrees || []).map((deg: any, dIdx: number) => ({
      name: deg.name,
      files: (deg.images || []).map((img: any, iIdx: number) => ({
        uid: img.id || `existing-img-${dIdx}-${iIdx}`,
        name: img.url.split("/").pop() || `degree-img-${iIdx}`,
        status: "done" as const,
        url: img.url,
        response: { url: img.url },
      })),
    }));

    teacherForm.setFieldsValue({
      code: record.code,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
      address: record.address,
      citizenId: record.citizenId || undefined,
      centerId: initialCenterId,
      yearsOfExperience: profile.yearsOfExperience,
      description: profile.description || "",
      classIds: classIds,
      specializationIds: specIds,
      bankAccountNumber: profile.bankAccountNumber || "",
      bankName: profile.bankName || "",
      insuranceStartDate: profile.insuranceStartDate ? dayjs(profile.insuranceStartDate) : undefined,
      employmentType: profile.employmentType || undefined,
      degrees: mappedDegrees,
    });
    setTeacherModalOpen(true);
  };

  const handleTeacherDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa giáo viên",
      content: `Bạn có chắc chắn muốn xóa giáo viên ${record.fullName}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await userService.remove(record.id);
          setTeachers((prev) => prev.filter((t) => t.id !== record.id));
          message.success("Xóa giáo viên thành công");
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleTeacherSubmit = async (values: TeacherFormValues) => {
    try {
      setLoading(true);
      const formattedDob = values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined;
      const formattedStartDate = values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined;
      const formattedEndDate = (values.endDate && values.endDate.isValid()) ? values.endDate.format("YYYY-MM-DD") : null;
      const cleanEmail = values.email && values.email.trim() !== "" ? values.email.trim() : undefined;
      const cleanAddress = values.address && values.address.trim() !== "" ? values.address.trim() : undefined;
      
      const formattedInsuranceDate = (values.insuranceStartDate && values.insuranceStartDate.isValid()) 
        ? values.insuranceStartDate.format("YYYY-MM-DD") 
        : null;

      const formattedDegrees = values.degrees !== undefined ? (values.degrees || []).map((deg: any) => {
        const imageUrls = (deg.files || [])
          .map((f: any) => f.response?.url || f.url)
          .filter(Boolean);
        return {
          name: deg.name,
          imageUrls,
        };
      }) : undefined;

      const profileData: any = {
        yearsOfExperience: values.yearsOfExperience || 0,
        description: values.description || "",
        bankAccountNumber: values.bankAccountNumber,
        bankName: values.bankName,
        insuranceStartDate: formattedInsuranceDate,
        employmentType: values.employmentType || null,
        classIds: values.classIds || [],
        specializationIds: values.specializationIds || [],
      };

      if (formattedDegrees !== undefined) {
        profileData.degrees = formattedDegrees;
      }

      const citizenIdVal = values.citizenId && values.citizenId.trim() !== "" ? values.citizenId.trim() : null;

      if (editingTeacher) {
        await userService.update(editingTeacher.id, {
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          endDate: formattedEndDate,
          address: cleanAddress,
          citizenId: citizenIdVal,
          teacherProfile: profileData,
        });
        message.success("Cập nhật giáo viên thành công");
      } else {
        const createdUser = await userService.create({
          password: values.password || "Teacher@123",
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          startDate: formattedStartDate!,
          address: cleanAddress,
          citizenId: citizenIdVal,
          roleId: getTeacherRoleId(),
          teacherProfile: profileData,
        });
        message.success(`Tạo giáo viên thành công! Mã: ${createdUser.code}`);
      }
      loadData();
      setTeacherModalOpen(false);
      teacherForm.resetFields();
    } catch (err: any) {
      if (err.message && err.message.includes("Số căn cước công dân đã tồn tại")) {
        message.error("Số căn cước công dân đã tồn tại");
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= STUDENT HANDLERS =================
  const handleStudentCreate = () => {
    setEditingStudent(null);
    setSelectedModalCenterId(selectedCenterId || undefined);
    studentForm.resetFields();
    studentForm.setFieldsValue({
      startDate: dayjs(),
      ...(selectedCenterId && { centerId: selectedCenterId }),
    });
    setStudentModalOpen(true);
  };

  const handleStudentEdit = (record: any) => {
    setEditingStudent(record);
    const profile = record.studentProfile || {};
    const classIds = profile.classes?.map((c: any) => c.id) || profile.classIds || [];

    // Auto-detect center based on classes
    const matchedClass = classes.find((c) => classIds.includes(c.id));
    const initialCenterId = matchedClass?.centerId || record.centerId || undefined;

    setSelectedModalCenterId(initialCenterId);

    studentForm.setFieldsValue({
      code: record.code,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
      address: record.address,
      citizenId: record.citizenId || undefined,
      centerId: initialCenterId,
      classIds: classIds,
      parentFullName: profile.parentFullName || "",
    });
    setStudentModalOpen(true);
  };

  const handleStudentDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa học sinh",
      content: `Bạn có chắc chắn muốn xóa học sinh ${record.fullName}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await userService.remove(record.id);
          setStudents((prev) => prev.filter((s) => s.id !== record.id));
          message.success("Xóa học sinh thành công");
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleStudentSubmit = async (values: StudentFormValues) => {
    try {
      setLoading(true);
      const formattedDob = values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined;
      const formattedStartDate = values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined;
      const formattedEndDate = (values.endDate && values.endDate.isValid()) ? values.endDate.format("YYYY-MM-DD") : null;
      const cleanEmail = values.email && values.email.trim() !== "" ? values.email.trim() : undefined;
      const cleanAddress = values.address && values.address.trim() !== "" ? values.address.trim() : undefined;
      
      const profileData = {
        classIds: values.classIds || [],
        parentFullName: values.parentFullName,
      };

      const citizenIdVal = values.citizenId && values.citizenId.trim() !== "" ? values.citizenId.trim() : null;

      if (editingStudent) {
        await userService.update(editingStudent.id, {
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          endDate: formattedEndDate,
          address: cleanAddress,
          citizenId: citizenIdVal,
          studentProfile: profileData,
        });
        message.success("Cập nhật học sinh thành công");
      } else {
        const createdUser = await userService.create({
          password: values.password || "Student@123",
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          startDate: formattedStartDate!,
          address: cleanAddress,
          citizenId: citizenIdVal,
          roleId: getStudentRoleId(),
          studentProfile: profileData,
        });
        message.success(`Tạo học sinh thành công! Mã: ${createdUser.code}`);
      }
      loadData();
      setStudentModalOpen(false);
      studentForm.resetFields();
    } catch (err: any) {
      if (err.message && err.message.includes("Số căn cước công dân đã tồn tại")) {
        message.error("Số căn cước công dân đã tồn tại");
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= ADMIN HANDLERS =================
  const handleAdminCreate = () => {
    setEditingAdmin(null);
    adminForm.resetFields();
    adminForm.setFieldsValue({
      startDate: dayjs(),
    });
    setAdminModalOpen(true);
  };

  const handleAdminEdit = (record: any) => {
    setEditingAdmin(record);
    adminForm.setFieldsValue({
      code: record.code,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : undefined,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
      address: record.address,
      citizenId: record.citizenId || undefined,
    });
    setAdminModalOpen(true);
  };

  const handleAdminDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa quản trị viên",
      content: `Bạn có chắc chắn muốn xóa quản trị viên ${record.fullName}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await userService.remove(record.id);
          setAdmins((prev) => prev.filter((a) => a.id !== record.id));
          message.success("Xóa quản trị viên thành công");
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleAdminSubmit = async (values: any) => {
    try {
      setLoading(true);
      const formattedDob = values.dateOfBirth ? values.dateOfBirth.format("YYYY-MM-DD") : undefined;
      const formattedStartDate = values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined;
      const formattedEndDate = (values.endDate && values.endDate.isValid()) ? values.endDate.format("YYYY-MM-DD") : null;
      const cleanEmail = values.email && values.email.trim() !== "" ? values.email.trim() : undefined;
      const cleanAddress = values.address && values.address.trim() !== "" ? values.address.trim() : undefined;
      
      const citizenIdVal = values.citizenId && values.citizenId.trim() !== "" ? values.citizenId.trim() : null;

      if (editingAdmin) {
        await userService.update(editingAdmin.id, {
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          endDate: formattedEndDate,
          address: cleanAddress,
          citizenId: citizenIdVal,
        });
        message.success("Cập nhật quản trị viên thành công");
      } else {
        const createdUser = await userService.create({
          password: values.password || "Admin@123456",
          fullName: values.fullName,
          email: cleanEmail,
          phone: values.phone,
          dateOfBirth: formattedDob,
          startDate: formattedStartDate!,
          address: cleanAddress,
          citizenId: citizenIdVal,
          roleId: getAdminRoleId(),
        });
        message.success(`Tạo quản trị viên thành công! Mã: ${createdUser.code}`);
      }
      loadData();
      setAdminModalOpen(false);
      adminForm.resetFields();
    } catch (err: any) {
      if (err.message && err.message.includes("Số căn cước công dân đã tồn tại")) {
        message.error("Số căn cước công dân đã tồn tại");
      } else {
        message.error(err.message || "Thao tác thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  // ================= PASSWORD RESET HANDLER =================
  const handleResetPassword = (record: any) => {
    setResetPasswordUser(record);
    setResetPasswordResult(null);
    setResetPasswordModalOpen(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser) return;
    try {
      const result = await authService.resetPassword({
        identifier: resetPasswordUser.code,
      });
      setResetPasswordResult(result.password);
      message.success("Reset mật khẩu thành công");
    } catch (err) {
      message.error("Reset thất bại");
    }
  };

  const handleCopyPassword = () => {
    if (resetPasswordResult) {
      navigator.clipboard.writeText(resetPasswordResult);
      message.success("Sao chép thành công");
    }
  };

  // ================= SPECIALIZATION CRUD HANDLERS =================
  const handleSpecializationCreate = () => {
    setEditingSpecialization(null);
    specializationForm.resetFields();
    setSpecializationModalOpen(true);
  };

  const handleSpecializationEdit = (record: any) => {
    setEditingSpecialization(record);
    specializationForm.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
    });
    setSpecializationModalOpen(true);
  };

  const handleSpecializationDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa chuyên môn",
      content: `Bạn có chắc muốn xóa chuyên môn ${record.name}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await academicService.specializations.remove(record.id);
          message.success("Xóa chuyên môn thành công");
          loadData();
        } catch (err) {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleSpecializationSubmit = async (values: any) => {
    try {
      if (editingSpecialization) {
        await academicService.specializations.update(editingSpecialization.id, values);
        message.success("Cập nhật chuyên môn thành công");
      } else {
        await academicService.specializations.create(values);
        message.success("Tạo chuyên môn thành công");
      }
      loadData();
      setSpecializationModalOpen(false);
      specializationForm.resetFields();
    } catch (err: any) {
      message.error(err.message || "Thao tác thất bại");
    }
  };

  // ================= TABLES & DATA RENDERING =================
  const teacherColumns = [
    {
      title: "Giáo viên",
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-gradient-to-r from-indigo-500 to-indigo-600 font-semibold uppercase text-xs">
            {record.fullName?.charAt(0) || "T"}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800">{record.fullName}</div>
            <div className="text-xs text-slate-400">@{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Chuyên môn",
      render: (_: any, record: any) => {
        const specIds = record.teacherProfile?.specializationIds || record.teacherProfile?.specializations?.map((s: any) => s.id) || [];
        const specs = specializations.filter((s) => specIds.includes(s.id));
        return (
          <div className="flex flex-wrap gap-1">
            {specs.map((s) => (
              <Tag key={s.id} color="cyan" className="border-none rounded-full px-2.5 py-0.5 text-xs bg-cyan-50 text-cyan-600 font-medium">
                {s.name}
              </Tag>
            ))}
            {specs.length === 0 && <span className="text-slate-400 text-xs">-</span>}
          </div>
        );
      },
    },
    {
      title: "Lớp học phụ trách",
      render: (_: any, record: any) => {
        const classIds = record.teacherProfile?.classIds || record.teacherProfile?.classes?.map((c: any) => c.id) || [];
        const tClasses = classes.filter((c) => classIds.includes(c.id));
        return (
          <div className="flex flex-wrap gap-1">
            {tClasses.map((c) => (
              <Tag key={c.id} color="purple" className="border-none rounded-full px-2.5 py-0.5 text-xs bg-purple-50 text-purple-600 font-medium">
                {c.name}
              </Tag>
            ))}
            {tClasses.length === 0 && <span className="text-slate-400 text-xs">-</span>}
          </div>
        );
      },
    },
    {
      title: "Kinh nghiệm",
      render: (_: any, record: any) => (
        <span className="text-slate-600 font-medium text-sm">
          {record.teacherProfile?.yearsOfExperience || 0} năm
        </span>
      ),
    },
    {
      title: "Liên hệ",
      render: (_: any, record: any) => (
        <div className="text-xs text-slate-500 space-y-0.5">
          {record.email && <div>{record.email}</div>}
          {record.phone && <div>{record.phone}</div>}
          {!record.email && !record.phone && <span>-</span>}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      render: (_: any, record: any) => {
        const active = isUserActive(record);
        const endDate = record.endDate ? dayjs(record.endDate) : null;
        const now = dayjs();
        const isScheduled = active && endDate && endDate.isAfter(now);
        const daysLeft = isScheduled ? endDate.diff(now, "day") : 0;

        if (!active) {
          return (
            <Tooltip title={endDate ? `Ngày kết thúc: ${endDate.format("DD/MM/YYYY")}` : "Tài khoản đã bị vô hiệu hóa"}>
              <Tag color="default" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500">
                Đã nghỉ
              </Tag>
            </Tooltip>
          );
        }

        if (isScheduled) {
          return (
            <Tooltip title={`Sẽ ngừng hoạt động vào ${endDate!.format("DD/MM/YYYY")} (còn ${daysLeft} ngày)`}>
              <div className="space-y-1">
                <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Đang hoạt động
                </Tag>
                <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                  <ClockCircleOutlined /> Còn {daysLeft} ngày
                </div>
              </div>
            </Tooltip>
          );
        }

        return (
          <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
            Đang hoạt động
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => handleTeacherEdit(record)}
          />
          {isUserActive(record) ? (
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined className="text-slate-400 hover:text-amber-600" />}
              onClick={() => handleResetPassword(record)}
            />
          ) : (
            <Tooltip title="Không thể khôi phục mật khẩu cho tài khoản đã nghỉ">
              <Button
                type="text"
                size="small"
                disabled
                icon={<KeyOutlined className="text-slate-300" />}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const studentColumns = [
    {
      title: "Học sinh",
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-gradient-to-r from-teal-500 to-teal-600 font-semibold uppercase text-xs">
            {record.fullName?.charAt(0) || "S"}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800">{record.fullName}</div>
            <div className="text-xs text-slate-400">@{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Lớp học tham gia",
      render: (_: any, record: any) => {
        const classIds = record.studentProfile?.classIds || record.studentProfile?.classes?.map((c: any) => c.id) || [];
        const sClasses = classes.filter((c) => classIds.includes(c.id));
        return (
          <div className="flex flex-wrap gap-1">
            {sClasses.map((c) => (
              <Tag key={c.id} color="blue" className="border-none rounded-full px-2.5 py-0.5 text-xs bg-blue-50 text-blue-600 font-medium">
                {c.name}
              </Tag>
            ))}
            {sClasses.length === 0 && <span className="text-slate-400 text-xs">-</span>}
          </div>
        );
      },
    },
    {
      title: "Thời gian học",
      render: (_: any, record: any) => {
        const start = record.startDate ? dayjs(record.startDate).format("DD/MM/YYYY") : null;
        const end = record.endDate ? dayjs(record.endDate).format("DD/MM/YYYY") : null;
        return (
          <div className="text-xs space-y-1">
            {start && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CalendarOutlined className="text-[10px]" />
                <span className="font-medium">Bắt đầu:</span> {start}
              </div>
            )}
            {end ? (
              <div className="flex items-center gap-1.5 text-orange-500">
                <ClockCircleOutlined className="text-[10px]" />
                <span className="font-medium">Kết thúc:</span> {end}
              </div>
            ) : (
              <div className="text-slate-400 italic">Chưa có ngày kết thúc</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Liên hệ",
      render: (_: any, record: any) => (
        <div className="text-xs text-slate-500 space-y-0.5">
          {record.email && <div>{record.email}</div>}
          {record.phone && <div>{record.phone}</div>}
          {!record.email && !record.phone && <span>-</span>}
        </div>
      ),
    },
    {
      title: "Trạng thái",
      render: (_: any, record: any) => {
        const active = isUserActive(record);
        const endDate = record.endDate ? dayjs(record.endDate) : null;
        const now = dayjs();

        // Scheduled deactivation: endDate is in the future
        const isScheduled = active && endDate && endDate.isAfter(now);
        const daysLeft = isScheduled ? endDate.diff(now, "day") : 0;

        if (!active) {
          return (
            <Tooltip title={endDate ? `Ngày kết thúc: ${endDate.format("DD/MM/YYYY")}` : "Tài khoản đã bị vô hiệu hóa"}>
              <Tag color="default" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500">
                Đã nghỉ
              </Tag>
            </Tooltip>
          );
        }

        if (isScheduled) {
          return (
            <Tooltip title={`Sẽ ngừng hoạt động vào ${endDate!.format("DD/MM/YYYY")} (còn ${daysLeft} ngày)`}>
              <div className="space-y-1">
                <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Đang hoạt động
                </Tag>
                <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                  <ClockCircleOutlined /> Còn {daysLeft} ngày
                </div>
              </div>
            </Tooltip>
          );
        }

        return (
          <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
            Đang hoạt động
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => handleStudentEdit(record)}
          />
          {isUserActive(record) ? (
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined className="text-slate-400 hover:text-amber-600" />}
              onClick={() => handleResetPassword(record)}
            />
          ) : (
            <Tooltip title="Không thể khôi phục mật khẩu cho tài khoản đã nghỉ">
              <Button
                type="text"
                size="small"
                disabled
                icon={<KeyOutlined className="text-slate-300" />}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const specializationColumns = [
    {
      title: "Chuyên môn",
      render: (_: any, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">{record.name}</div>
          <div className="text-xs text-slate-400">Mã: {record.code}</div>
        </div>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (val: string) => <span className="text-slate-500 text-sm">{val || "—"}</span>,
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => handleSpecializationEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
            onClick={() => handleSpecializationDelete(record)}
          />
        </Space>
      ),
    },
  ];

  // ================= DYNAMIC DATA FILTERS =================
  const filteredCenters = centers.filter((c) => {
    const q = centerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const selectedCenter = centers.find((c) => c.id === selectedCenterId);
  const centerClasses = classes.filter((cls) => cls.centerId === selectedCenterId);
  const centerClassesIds = centerClasses.map((cls) => cls.id);

  const centerTeachers = teachers.filter((t) => {
    const tClasses = t.teacherProfile?.classes || [];
    return t.centerId === selectedCenterId || tClasses.some((c: any) => c.centerId === selectedCenterId);
  });

  const centerStudents = students.filter((s) => {
    const sClasses = s.studentProfile?.classes || [];
    return s.centerId === selectedCenterId || sClasses.some((c: any) => c.centerId === selectedCenterId);
  });

  const filteredTeachers = centerTeachers.filter((t) => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      t.fullName?.toLowerCase().includes(q) ||
      t.code?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q)
    );
  });

  const filteredStudents = centerStudents.filter((s) => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  });

  const filteredAdmins = admins.filter((a) => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      a.fullName?.toLowerCase().includes(q) ||
      a.code?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q)
    );
  });

  const adminColumns = [
    {
      title: "Quản trị viên",
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-gradient-to-r from-emerald-500 to-emerald-600 font-semibold uppercase text-xs">
            {record.fullName?.charAt(0) || "A"}
          </Avatar>
          <div>
            <div className="font-semibold text-slate-800">{record.fullName}</div>
            <div className="text-xs text-slate-400">@{record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Căn cước công dân (CCCD)",
      render: (_: any, record: any) => (
        <span className="text-slate-600 font-medium text-sm">
          {record.citizenId || "-"}
        </span>
      ),
    },
    {
      title: "Liên hệ",
      render: (_: any, record: any) => (
        <div className="text-xs text-slate-500 space-y-0.5">
          {record.email && <div>{record.email}</div>}
          {record.phone && <div>{record.phone}</div>}
          {!record.email && !record.phone && <span>-</span>}
        </div>
      ),
    },
    {
      title: "Thời gian làm việc",
      render: (_: any, record: any) => {
        const start = record.startDate ? dayjs(record.startDate).format("DD/MM/YYYY") : null;
        const end = record.endDate ? dayjs(record.endDate).format("DD/MM/YYYY") : null;
        return (
          <div className="text-xs space-y-1">
            {start && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CalendarOutlined className="text-[10px]" />
                <span className="font-medium">Bắt đầu:</span> {start}
              </div>
            )}
            {end ? (
              <div className="flex items-center gap-1.5 text-orange-500">
                <ClockCircleOutlined className="text-[10px]" />
                <span className="font-medium">Kết thúc:</span> {end}
              </div>
            ) : (
              <div className="text-slate-400 italic">Chưa có ngày kết thúc</div>
            )}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      render: (_: any, record: any) => {
        const active = isUserActive(record);
        const endDate = record.endDate ? dayjs(record.endDate) : null;
        const now = dayjs();
        const isScheduled = active && endDate && endDate.isAfter(now);
        const daysLeft = isScheduled ? endDate.diff(now, "day") : 0;

        if (!active) {
          return (
            <Tooltip title={endDate ? `Ngày kết thúc: ${endDate.format("DD/MM/YYYY")}` : "Tài khoản đã bị vô hiệu hóa"}>
              <Tag color="default" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-500">
                Đã nghỉ
              </Tag>
            </Tooltip>
          );
        }

        if (isScheduled) {
          return (
            <Tooltip title={`Sẽ ngừng hoạt động vào ${endDate!.format("DD/MM/YYYY")} (còn ${daysLeft} ngày)`}>
              <div className="space-y-1">
                <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  Đang hoạt động
                </Tag>
                <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                  <ClockCircleOutlined /> Còn {daysLeft} ngày
                </div>
              </div>
            </Tooltip>
          );
        }

        return (
          <Tag color="success" className="border-none rounded-full px-2.5 py-0.5 text-xs font-semibold">
            Đang hoạt động
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => handleAdminEdit(record)}
          />
          {isUserActive(record) ? (
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined className="text-slate-400 hover:text-amber-600" />}
              onClick={() => handleResetPassword(record)}
            />
          ) : (
            <Tooltip title="Không thể khôi phục mật khẩu cho tài khoản đã nghỉ">
              <Button
                type="text"
                size="small"
                disabled
                icon={<KeyOutlined className="text-slate-300" />}
              />
            </Tooltip>
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
            onClick={() => handleAdminDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#4f46e5",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        },
        components: {
          Card: {
            colorBgContainer: "#ffffff",
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f1f5f9",
          },
        },
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1600px] mx-auto space-y-6">

            {/* TOP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight">
                  Dashboard Quản Lý
                </Title>
                <Text className="text-slate-400 text-sm">
                  Quản lý trung tâm, lớp học, giáo viên & học sinh đơn giản & hiện đại
                </Text>
              </div>
            </div>

            {/* DASHBOARD GRID LAYOUT */}
            <Row gutter={[24, 24]} className="align-start">

              {/* LEFT SIDEBAR: CENTERS LIST */}
              <Col xs={24} lg={6}>
                <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 sticky top-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800 m-0">
                      Trung tâm ({centers.length})
                    </h3>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={handleCenterCreate}
                      className="bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center font-medium"
                    >
                      Thêm mới
                    </Button>
                  </div>

                  <Input
                    placeholder="Tìm kiếm trung tâm..."
                    prefix={<SearchOutlined className="text-slate-400" />}
                    value={centerSearch}
                    onChange={(e) => setCenterSearch(e.target.value)}
                    className="rounded-xl border-slate-200"
                    allowClear
                  />

                  <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                    {filteredCenters.map((center) => {
                      const isSelected = center.id === selectedCenterId;
                      return (
                        <div
                          key={center.id}
                          onClick={() => setSelectedCenterId(center.id)}
                          className={`group cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left ${isSelected
                            ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-sm"
                            : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50/50 hover:border-slate-200"
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-bold text-sm line-clamp-1 flex-1 pr-2">
                              🏫 {center.name}
                            </div>
                            <span
                              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isSelected ? "bg-indigo-600" : "bg-slate-300 group-hover:bg-indigo-400"
                                }`}
                            />
                          </div>

                          <div className="text-xs text-slate-400 mt-2 line-clamp-1 flex items-center gap-1.5">
                            <EnvironmentOutlined /> {center.address || "Chưa cập nhật địa chỉ"}
                          </div>

                          {/* Quick Actions (Hover State) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1 mt-2.5 pt-2 border-t border-dashed border-slate-200/50">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined className="text-slate-400 hover:text-indigo-600 text-xs" />}
                              onClick={(e) => handleCenterEdit(center, e)}
                            />
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600 text-xs" />}
                              onClick={(e) => handleCenterDelete(center, e)}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {filteredCenters.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        Không tìm thấy trung tâm nào
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              {/* RIGHT WORKSPACE: DETAIL WORKSPACE */}
              <Col xs={24} lg={18}>
                {!selectedCenterId ? (
                  <div className="flex flex-col items-center justify-center min-h-[450px] bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <div className="space-y-2">
                          <Text className="text-slate-500 text-base font-semibold">
                            Chưa chọn trung tâm quản lý
                          </Text>
                          <p className="text-slate-400 text-xs max-w-sm mx-auto">
                            Hãy click chọn một trung tâm từ danh sách bên trái hoặc tạo mới trung tâm để bắt đầu quản lý.
                          </p>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* CENTER COVER IMAGE (If exists) */}
                    {/* {(selectedCenter?.image || (selectedCenter?.images && selectedCenter.images.length > 0)) && (
                      <div className="w-full h-48 rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100">
                        <img
                          src={resolveMediaUrl(selectedCenter.image || selectedCenter.images[0].url)}
                          alt={selectedCenter.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image if failed to load
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )} */}

                    {/* CENTER CONTACT & GENERAL DETAIL */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-2xl">🏫</span>
                            <Title level={3} className="!mb-0 !text-slate-800 font-extrabold">
                              {selectedCenter?.name}
                            </Title>
                            <Tag color="success" className="rounded-full px-2.5 py-0.5 border-none bg-emerald-50 text-emerald-600 font-semibold">
                              Đang hoạt động
                            </Tag>
                          </div>
                          {selectedCenter?.description && (
                            <Paragraph className="text-slate-500 mt-2 mb-0 text-sm max-w-3xl">
                              {selectedCenter.description}
                            </Paragraph>
                          )}
                        </div>

                        <Space>
                          <Button
                            icon={<EditOutlined />}
                            onClick={(e) => handleCenterEdit(selectedCenter, e)}
                            className="rounded-xl border-slate-200 hover:text-indigo-600 hover:border-indigo-600"
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => handleCenterDelete(selectedCenter, e)}
                            className="rounded-xl"
                          >
                            Xóa trung tâm
                          </Button>
                        </Space>
                      </div>

                      <Divider className="my-5 border-slate-100" />

                      <Row gutter={[24, 16]}>
                        <Col xs={24} sm={8}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                              <PhoneOutlined />
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số điện thoại</div>
                              <div className="text-sm font-bold text-slate-700">{selectedCenter?.phone || "Chưa cập nhật"}</div>
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                              <MailOutlined />
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email liên hệ</div>
                              <div className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{selectedCenter?.email || "Chưa cập nhật"}</div>
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} sm={8}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                              <EnvironmentOutlined />
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Địa chỉ</div>
                              <div className="text-sm font-bold text-slate-700 truncate max-w-[230px]" title={selectedCenter?.address}>
                                {selectedCenter?.address || "Chưa cập nhật"}
                              </div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>

                    {/* CENTER IMAGES GALLERY */}
                    {selectedCenter?.images && selectedCenter.images.length > 0 && (
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">🖼️</span>
                          <h3 className="text-base font-bold text-slate-800 m-0">Ảnh chi tiết trung tâm ({selectedCenter.images.length})</h3>
                        </div>
                        <Image.PreviewGroup>
                          <Row gutter={[16, 16]}>
                            {selectedCenter.images.map((img: any) => (
                              <Col xs={12} sm={8} md={6} key={img.id}>
                                <div className="group aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-100">
                                  <Image
                                    src={resolveMediaUrl(img.url)}
                                    alt="Center detail"
                                    wrapperClassName="w-full h-full"
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    preview={{
                                      mask: (
                                        <span className="text-white text-xs font-semibold bg-slate-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm">Xem ảnh</span>
                                      ),
                                    }}
                                  />
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Image.PreviewGroup>
                      </div>
                    )}

                    {/* STATS INFO */}
                    <Row gutter={[16, 16]}>
                      {[
                        {
                          title: "Lớp học",
                          value: centerClasses.length,
                          icon: <BookOutlined className="text-indigo-500 text-lg" />,
                          bg: "bg-indigo-50",
                          border: "border-indigo-100/60",
                        },
                        {
                          title: "Giáo viên",
                          value: centerTeachers.length,
                          icon: <TeamOutlined className="text-violet-500 text-lg" />,
                          bg: "bg-violet-50",
                          border: "border-violet-100/60",
                        },
                        {
                          title: "Học sinh",
                          value: centerStudents.length,
                          icon: <UserOutlined className="text-teal-500 text-lg" />,
                          bg: "bg-teal-50",
                          border: "border-teal-100/60",
                        },
                      ].map((item, index) => (
                        <Col xs={24} sm={8} key={index}>
                          <div className={`bg-white border ${item.border} rounded-2xl p-5 flex items-center justify-between shadow-sm`}>
                            <div>
                              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{item.title}</span>
                              <h2 className="text-2xl font-black text-slate-800 mt-1 mb-0">{item.value}</h2>
                            </div>
                            <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                              {item.icon}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>

                    {/* CLASSES GRID SECTION */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📚</span>
                          <h3 className="text-base font-bold text-slate-800 m-0">Lớp học thuộc trung tâm</h3>
                        </div>
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={handleClassCreate}
                          className="hover:text-indigo-600 hover:border-indigo-600 rounded-xl font-semibold text-xs"
                        >
                          Tạo lớp học mới
                        </Button>
                      </div>

                      <Row gutter={[16, 16]}>
                        {centerClasses.map((cls) => {
                          const classStudentsCount = students.filter((s) => {
                            const sClassIds = s.studentProfile?.classIds || s.studentProfile?.classes?.map((c: any) => c.id) || [];
                            return sClassIds.includes(cls.id);
                          }).length;

                          const mapped = classCurriculums.filter((cc) => cc.classId === cls.id);

                          return (
                            <Col xs={24} sm={12} md={8} key={cls.id}>
                              <div className="group border border-slate-100 rounded-2xl p-5 bg-slate-50/20 hover:bg-white hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 relative flex flex-col justify-between min-h-[120px]">
                                <div>
                                  <div className="flex items-start justify-between">
                                    <div className="font-bold text-slate-800 text-sm truncate max-w-[130px]">{cls.name}</div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                                      <Button
                                        type="text"
                                        size="small"
                                        icon={<EditOutlined className="text-slate-400 hover:text-indigo-600 text-xs" />}
                                        onClick={() => handleClassEdit(cls)}
                                      />
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600 text-xs" />}
                                        onClick={() => handleClassDelete(cls)}
                                      />
                                    </div>
                                  </div>
                                  {cls.specializationId && (
                                    <div className="mt-1">
                                      <span className="text-[10px] text-emerald-600 bg-emerald-50 font-semibold px-2.5 py-0.5 rounded-full inline-block">
                                        📖 {specializations.find(s => s.id === cls.specializationId)?.name || "Môn học khác"}
                                      </span>
                                    </div>
                                  )}
                                  {mapped.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {mapped.map((m) => {
                                        const name = m.curriculum?.title || m.curriculum?.code;
                                        if (!name) return null;
                                        return (
                                          <span key={m.id} className="text-[10px] text-indigo-500 bg-indigo-50 font-semibold px-2.5 py-0.5 rounded-full">
                                            📚 {name}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {cls.description && (
                                    <div className="text-slate-400 text-xs mt-1.5 line-clamp-2">{cls.description}</div>
                                  )}
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                                  <span className="text-slate-400 text-xs">Sĩ số:</span>
                                  <Tag color="blue" className="rounded-full px-2.5 py-0.5 m-0 font-semibold border-none bg-blue-50 text-blue-600 text-[11px]">
                                    {classStudentsCount} học viên
                                  </Tag>
                                </div>
                              </div>
                            </Col>
                          );
                        })}

                        {centerClasses.length === 0 && (
                          <Col span={24}>
                            <div className="text-center py-8 border border-dashed border-slate-100 rounded-2xl bg-slate-50/10">
                              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lớp học nào tại trung tâm này" />
                            </div>
                          </Col>
                        )}
                      </Row>
                    </div>

                    {/* GOOGLE MAP EMBED (If exists) */}
                    {selectedCenter?.mapEmbedUrl && (
                      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-lg">📍</span>
                          <h3 className="text-base font-bold text-slate-800 m-0">Vị trí trung tâm</h3>
                        </div>
                        <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                          <iframe
                            src={selectedCenter.mapEmbedUrl}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={`Map of ${selectedCenter.name}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* USERS ACCORDION/TAB CARD */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                      <Tabs
                        defaultActiveKey="teachers"
                        className="custom-tabs border-b-0"
                        items={[
                          {
                            key: "teachers",
                            label: (
                              <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                                <TeamOutlined />
                                Giáo viên ({centerTeachers.length})
                              </span>
                            ),
                            children: (
                              <div className="space-y-4 pt-4">
                                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                  <Input
                                    placeholder="Tìm kiếm giáo viên theo tên, mã..."
                                    prefix={<SearchOutlined className="text-slate-400" />}
                                    value={teacherSearch}
                                    onChange={(e) => setTeacherSearch(e.target.value)}
                                    className="max-w-md rounded-xl border-slate-200"
                                    allowClear
                                  />
                                  <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleTeacherCreate}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                                  >
                                    Tạo Giáo viên
                                  </Button>
                                </div>

                                <Table
                                  rowKey="id"
                                  dataSource={filteredTeachers}
                                  columns={teacherColumns}
                                  pagination={{ pageSize: 5, showSizeChanger: false }}
                                  locale={{ emptyText: "Không tìm thấy giáo viên nào" }}
                                  className="border border-slate-100 rounded-2xl overflow-hidden"
                                />
                              </div>
                            ),
                          },
                          {
                            key: "students",
                            label: (
                              <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                                <UserOutlined />
                                Học sinh ({centerStudents.length})
                              </span>
                            ),
                            children: (
                              <div className="space-y-4 pt-4">
                                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                  <Input
                                    placeholder="Tìm kiếm học sinh theo tên, mã..."
                                    prefix={<SearchOutlined className="text-slate-400" />}
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    className="max-w-md rounded-xl border-slate-200"
                                    allowClear
                                  />
                                  <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleStudentCreate}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                                  >
                                    Tạo Học sinh
                                  </Button>
                                </div>

                                <Table
                                  rowKey="id"
                                  dataSource={filteredStudents}
                                  columns={studentColumns}
                                  pagination={{ pageSize: 5, showSizeChanger: false }}
                                  locale={{ emptyText: "Không tìm thấy học sinh nào" }}
                                  className="border border-slate-100 rounded-2xl overflow-hidden"
                                />
                              </div>
                            ),
                          },
                          {
                            key: "specializations",
                            label: (
                              <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                                <BookOutlined />
                                Chuyên môn ({specializations.length})
                              </span>
                            ),
                            children: (
                              <div className="space-y-4 pt-4">
                                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                  <div className="text-slate-400 text-sm">Danh sách các Chuyên môn học thuật khả dụng</div>
                                  <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleSpecializationCreate}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                                  >
                                    Tạo Chuyên môn
                                  </Button>
                                </div>

                                <Table
                                  rowKey="id"
                                  dataSource={specializations}
                                  columns={specializationColumns}
                                  pagination={{ pageSize: 5, showSizeChanger: false }}
                                  locale={{ emptyText: "Không tìm thấy chuyên môn nào" }}
                                  className="border border-slate-100 rounded-2xl overflow-hidden"
                                />
                              </div>
                            ),
                          },
                          {
                            key: "admins",
                            label: (
                              <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                                <SafetyCertificateOutlined />
                                Quản trị viên ({admins.length})
                              </span>
                            ),
                            children: (
                              <div className="space-y-4 pt-4">
                                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                  <Input
                                    placeholder="Tìm kiếm quản trị viên theo tên, mã..."
                                    prefix={<SearchOutlined className="text-slate-400" />}
                                    value={adminSearch}
                                    onChange={(e) => setAdminSearch(e.target.value)}
                                    className="max-w-md rounded-xl border-slate-200"
                                    allowClear
                                  />
                                  <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdminCreate}
                                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                                  >
                                    Tạo Quản trị viên
                                  </Button>
                                </div>

                                <Table
                                  rowKey="id"
                                  dataSource={filteredAdmins}
                                  columns={adminColumns}
                                  pagination={{ pageSize: 5, showSizeChanger: false }}
                                  locale={{ emptyText: "Không tìm thấy quản trị viên nào" }}
                                  className="border border-slate-100 rounded-2xl overflow-hidden"
                                />
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>

                  </div>
                )}
              </Col>
            </Row>

            {/* CREATE / EDIT CENTER MODAL */}
            <Modal
              title={editingCenter ? "Cập nhật thông tin Trung tâm" : "Tạo Trung tâm mới"}
              open={centerModalOpen}
              onCancel={() => setCenterModalOpen(false)}
              onOk={() => centerForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              width={720}
              centered
              styles={{
                body: {
                  maxHeight: "65vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "8px",
                },
              }}
              className="rounded-2xl"
            >
              <Form
                form={centerForm}
                layout="vertical"
                onFinish={handleCenterSubmit}
                className="pt-2"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label="Tên trung tâm"
                      rules={[{ required: true, message: "Vui lòng nhập tên trung tâm!" }]}
                    >
                      <Input placeholder="Ví dụ: Kata Hà Nội" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại liên hệ"
                      rules={[{ required: true, message: "Vui lòng nhập số điện thoại liên hệ!" }]}
                    >
                      <Input placeholder="Ví dụ: 0123456789" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="Email liên hệ"
                      rules={[
                        { required: true, message: "Vui lòng nhập email liên hệ!" },
                        { type: "email", message: "Email không hợp lệ!" }
                      ]}
                    >
                      <Input placeholder="Ví dụ: contact@kata.edu.vn" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="address"
                      label="Địa chỉ"
                      rules={[{ required: true, message: "Vui lòng nhập địa chỉ!" }]}
                    >
                      <Input placeholder="Ví dụ: Cầu Giấy, Hà Nội" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Hình ảnh trung tâm (Tối đa 20 ảnh)" tooltip="Hỗ trợ tải lên nhiều hình ảnh cùng lúc để giới thiệu trung tâm">
                  <Upload
                    listType="picture-card"
                    fileList={subImagesFileList}
                    beforeUpload={() => false}
                    onChange={handleUploadChange}
                    accept="image/*"
                    multiple
                    maxCount={20}
                    showUploadList={{ showPreviewIcon: false }}
                  >
                    {subImagesFileList.length < 20 && (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
                      </div>
                    )}
                  </Upload>
                </Form.Item>

                <Form.Item name="mapEmbedUrl" label="Link bản đồ nhúng (Google Map Embed URL)">
                  <Input placeholder="Ví dụ: https://www.google.com/maps/embed?pb=..." className="rounded-xl" />
                </Form.Item>

                <Form.Item name="description" label="Mô tả chi tiết">
                  <Input.TextArea placeholder="Nhập một vài thông tin mô tả giới thiệu về trung tâm..." rows={3} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* CREATE / EDIT CLASS MODAL */}
            <Modal
              title={editingClass ? "Cập nhật thông tin Lớp học" : "Tạo Lớp học mới"}
              open={classModalOpen}
              onCancel={() => setClassModalOpen(false)}
              onOk={() => classForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              className="rounded-2xl"
            >
              <Form
                form={classForm}
                layout="vertical"
                onFinish={handleClassSubmit}
                className="pt-2"
              >
                <Form.Item
                  name="name"
                  label="Tên lớp học"
                  rules={[{ required: true, message: "Vui lòng nhập tên lớp học!" }]}
                >
                  <Input placeholder="Ví dụ: Toán nâng cao 6A" className="rounded-xl" />
                </Form.Item>

                <Form.Item
                  name="centerId"
                  label="Thuộc trung tâm"
                  rules={[{ required: true, message: "Vui lòng chọn trung tâm!" }]}
                >
                  <Select placeholder="Chọn trung tâm" className="rounded-xl">
                    {centers.map((center) => (
                      <Select.Option key={center.id} value={center.id}>
                        {center.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  name="specializationId"
                  label="Môn học (Chuyên môn)"
                  rules={[{ required: true, message: "Vui lòng chọn môn học cho lớp!" }]}
                >
                  <Select placeholder="Chọn môn học" className="rounded-xl" disabled={!!editingClass}>
                    {specializations.map((spec) => (
                      <Select.Option key={spec.id} value={spec.id}>
                        {spec.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="curriculumIds" label="Giáo trình (Không bắt buộc)">
                  <Select mode="multiple" placeholder="Chọn giáo trình gắn với lớp" allowClear className="rounded-xl">
                    {curriculums.map((curr) => (
                      <Select.Option key={curr.id} value={curr.id}>
                        {curr.title || curr.code}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item name="description" label="Mô tả lớp học">
                  <Input.TextArea placeholder="Nhập mô tả ngắn về lớp học này..." rows={2} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* CREATE / EDIT TEACHER MODAL */}
            <Modal
              title={editingTeacher ? "Cập nhật Giáo viên" : "Tạo Giáo viên mới"}
              open={teacherModalOpen}
              onCancel={() => {
                setTeacherModalOpen(false);
                teacherForm.resetFields();
              }}
              onOk={() => teacherForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              width={650}
              centered
              styles={{
                body: {
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "8px",
                },
              }}
              className="rounded-2xl"
            >
              <Form
                form={teacherForm}
                layout="vertical"
                onFinish={handleTeacherSubmit}
                className="pt-2"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="code"
                      label="Mã giáo viên"
                    >
                      <Input placeholder="Hệ thống tự sinh" disabled className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="fullName"
                      label="Họ và tên"
                      rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                    >
                      <Input placeholder="Nguyễn Văn A" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[{ type: "email", message: "Email không hợp lệ!" }]}
                    >
                      <Input placeholder="teacher@email.com" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại"
                      rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
                    >
                      <Input placeholder="0123456789" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="dateOfBirth"
                      label="Ngày sinh"
                      rules={[{ required: true, message: "Vui lòng chọn ngày sinh!" }]}
                    >
                      <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày sinh" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="address" label="Địa chỉ">
                      <Input placeholder="Hà Nội" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="citizenId"
                      label="Căn cước công dân (CCCD - 12 chữ số)"
                      rules={[
                        { required: !editingTeacher, message: "Vui lòng nhập số CCCD!" },
                        { pattern: /^\d{12}$/, message: "Số CCCD phải gồm đúng 12 chữ số!" }
                      ]}
                    >
                      <Input placeholder="Nhập 12 chữ số CCCD" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="Ngày bắt đầu giảng dạy"
                      tooltip="Ngày giáo viên chính thức tham gia trung tâm."
                      rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu!" }]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        placeholder="Chọn ngày bắt đầu"
                        className="rounded-xl"
                        format="DD/MM/YYYY"
                        disabled={!!editingTeacher}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {editingTeacher && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="endDate"
                        label="Ngày kết thúc giảng dạy"
                        tooltip="Nếu endDate ≤ ngày hiện tại → tài khoản bị inactive. Nếu endDate trong tương lai → tài khoản sẽ bị cron tự động vô hiệu hóa khi đến ngày. Bỏ trống = hoạt động vô thời hạn."
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          placeholder="Bỏ trống = hoạt động mãi"
                          className="rounded-xl"
                          format="DD/MM/YYYY"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {editingTeacher && (
                  <>
                    {/* Active status banner */}
                    {(() => {
                      const active = isUserActive(editingTeacher);
                      const endDate = editingTeacher.endDate ? dayjs(editingTeacher.endDate) : null;
                      const isScheduled = active && endDate && endDate.isAfter(dayjs());
                      const daysLeft = isScheduled ? endDate.diff(dayjs(), "day") : 0;

                      return (
                        <div className={`rounded-xl p-3 mb-4 text-sm flex items-center gap-2 ${!active
                          ? "bg-slate-50 border border-slate-200 text-slate-600"
                          : isScheduled
                            ? "bg-amber-50 border border-amber-200 text-amber-700"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          }`}>
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!active ? "bg-slate-400" : isScheduled ? "bg-amber-400" : "bg-emerald-400"
                            }`} />
                          {!active && (
                            <span>Tài khoản <strong>đã nghỉ</strong> (inactive){endDate && ` — kết thúc ngày ${endDate.format("DD/MM/YYYY")}`}</span>
                          )}
                          {active && isScheduled && (
                            <span>Tài khoản đang hoạt động — <strong>sẽ tự động nghỉ sau {daysLeft} ngày</strong> (ngày {endDate!.format("DD/MM/YYYY")})</span>
                          )}
                          {active && !isScheduled && (
                            <span>Tài khoản <strong>đang hoạt động</strong></span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-600 space-y-1">
                      <div className="font-semibold text-blue-700">ℹ️ Quy tắc trạng thái tài khoản:</div>
                      <ul className="list-disc pl-4 m-0 space-y-0.5">
                        <li><strong>endDate trống</strong> hoặc <strong>trong tương lai</strong> → Tài khoản <strong>active</strong> (đăng nhập được)</li>
                        <li><strong>endDate ≤ hôm nay</strong> → Tài khoản <strong>inactive</strong> (không đăng nhập được)</li>
                        <li>Hệ thống backend sẽ tự động kiểm tra và vô hiệu hóa tài khoản khi đến ngày kết thúc</li>
                      </ul>
                    </div>
                  </>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="centerId"
                      label="Trung tâm liên kết"
                      rules={[{ required: true, message: "Vui lòng chọn trung tâm!" }]}
                    >
                      <Select
                        placeholder="Chọn trung tâm"
                        className="rounded-xl"
                        onChange={(val) => {
                          setSelectedModalCenterId(val);
                          // Clear class selection if center changes to prevent mismatch
                          teacherForm.setFieldsValue({ classIds: [] });
                        }}
                        options={centers.map(c => ({ label: c.name, value: c.id }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="yearsOfExperience"
                      label="Kinh nghiệm (số năm)"
                    >
                      <InputNumber className="w-full rounded-xl" min={0} placeholder="Ví dụ: 5" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="classIds"
                  label="Lớp học phụ trách"
                  rules={[{ required: true, message: "Chọn ít nhất 1 lớp học!" }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn lớp học (chọn trung tâm trước để lọc)"
                    style={{ width: "100%" }}
                    className="rounded-xl"
                    options={classes
                      .filter((c) => !selectedModalCenterId || c.centerId === selectedModalCenterId)
                      .map((c) => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>

                <Form.Item
                  name="specializationIds"
                  label="Chuyên môn"
                  rules={[{ required: true, message: "Chọn ít nhất 1 chuyên môn!" }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn chuyên môn"
                    style={{ width: "100%" }}
                    className="rounded-xl"
                    options={specializations.map((s) => ({ label: s.name, value: s.id }))}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="bankName"
                      label="Tên ngân hàng"
                      rules={[{ required: true, message: "Vui lòng nhập tên ngân hàng!" }]}
                    >
                      <Input placeholder="Ví dụ: Vietcombank" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="bankAccountNumber"
                      label="Số tài khoản ngân hàng"
                      rules={[{ required: true, message: "Vui lòng nhập số tài khoản!" }]}
                    >
                      <Input placeholder="Ví dụ: 00123456789" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="employmentType"
                      label="Loại hợp đồng"
                    >
                      <Select
                        placeholder="Chọn loại hợp đồng"
                        className="rounded-xl"
                        allowClear
                        options={[
                          { label: "Toàn thời gian (Full-time)", value: "full_time" },
                          { label: "Bán thời gian (Part-time)", value: "part_time" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="insuranceStartDate"
                      label="Ngày đóng bảo hiểm"
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        placeholder="Chọn ngày đóng bảo hiểm"
                        className="rounded-xl"
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {!editingTeacher && (
                  <Form.Item
                    name="password"
                    label="Mật khẩu tài khoản"
                    rules={[
                      { required: true, message: "Nhập mật khẩu!" },
                      { min: 8, message: "Mật khẩu phải tối thiểu từ 8 ký tự!" },
                    ]}
                  >
                    <Input.Password placeholder="Tối thiểu 8 ký tự" className="rounded-xl" />
                  </Form.Item>
                )}

                <Form.Item
                  name="description"
                  label="Giới thiệu / Ghi chú"
                  rules={[{ required: true, message: "Vui lòng nhập mô tả giới thiệu!" }]}
                >
                  <Input.TextArea placeholder="Nhập một số thông tin giới thiệu ngắn về giáo viên..." rows={2} className="rounded-xl" />
                </Form.Item>

                <div className="border-t border-slate-100 pt-4 mt-4">
                  <h4 className="font-bold text-slate-700 text-sm mb-3">Bằng cấp & Chứng chỉ giáo viên</h4>
                  <Form.List name="degrees">
                    {(fields, { add, remove }) => (
                      <div className="space-y-4">
                        {fields.map(({ key, name, ...restField }) => (
                          <Card
                            key={key}
                            size="small"
                            className="border-slate-100 bg-slate-50/50 rounded-xl relative"
                            title={`Bằng cấp #${name + 1}`}
                            extra={
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            }
                          >
                            <Form.Item
                              {...restField}
                              name={[name, 'name']}
                              label="Tên bằng cấp / chứng chỉ"
                              rules={[{ required: true, message: 'Nhập tên bằng cấp!' }]}
                            >
                              <Input placeholder="Ví dụ: Cử nhân Ngôn ngữ Anh, Chứng chỉ IELTS..." className="rounded-xl" />
                            </Form.Item>

                            <Form.Item
                              {...restField}
                              name={[name, 'files']}
                              label="Ảnh bằng cấp (Cần ít nhất 1 ảnh)"
                              valuePropName="fileList"
                              getValueFromEvent={(e: any) => {
                                if (Array.isArray(e)) return e;
                                return e && e.fileList;
                              }}
                              rules={[
                                {
                                  validator(_, value) {
                                    if (value && value.length > 0) return Promise.resolve();
                                    return Promise.reject(new Error("Vui lòng tải lên ít nhất 1 ảnh bằng cấp!"));
                                  }
                                }
                              ]}
                            >
                              <Upload
                                customRequest={async (options) => {
                                  const { file, onSuccess, onError } = options;
                                  try {
                                    const urls = await userService.uploadTeacherDegreeImages([file as File]);
                                    onSuccess!({ url: urls[0] });
                                  } catch (err) {
                                    onError!(err as Error);
                                  }
                                }}
                                listType="picture-card"
                                multiple
                                accept="image/*"
                                itemRender={(originNode, file, fileList, actions) => {
                                  const url = file.url || file.response?.url;
                                  if (!url) return originNode;
                                  return (
                                    <div className="relative group w-full h-full rounded-lg overflow-hidden border border-slate-200">
                                      <SecureImage src={url} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EyeOutlined className="text-white text-xs" />}
                                          onClick={() => {
                                            setPreviewImage(url);
                                            setPreviewTitle(file.name || "Xem ảnh bằng cấp");
                                            setPreviewOpen(true);
                                          }}
                                        />
                                        <Button
                                          type="text"
                                          size="small"
                                          danger
                                          icon={<DeleteOutlined className="text-white text-xs" />}
                                          onClick={actions.remove}
                                        />
                                      </div>
                                    </div>
                                  );
                                }}
                              >
                                <div>
                                  <PlusOutlined />
                                  <div style={{ marginTop: 8 }}>Tải ảnh</div>
                                </div>
                              </Upload>
                            </Form.Item>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          block
                          icon={<PlusOutlined />}
                          className="rounded-xl"
                        >
                          Thêm bằng cấp mới
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>
              </Form>
            </Modal>

            {/* CREATE / EDIT STUDENT MODAL */}
            <Modal
              title={editingStudent ? "Cập nhật Học sinh" : "Tạo Học sinh mới"}
              open={studentModalOpen}
              onCancel={() => {
                setStudentModalOpen(false);
                studentForm.resetFields();
              }}
              onOk={() => studentForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              width={650}
              centered
              styles={{
                body: {
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "8px",
                },
              }}
              className="rounded-2xl"
            >
              <Form
                form={studentForm}
                layout="vertical"
                onFinish={handleStudentSubmit}
                className="pt-2"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="code"
                      label="Mã học sinh"
                    >
                      <Input placeholder="Hệ thống tự sinh" disabled className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="fullName"
                      label="Họ và tên"
                      rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                    >
                      <Input placeholder="Nguyễn Văn B" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[{ type: "email", message: "Email không hợp lệ!" }]}
                    >
                      <Input placeholder="student@email.com" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại"
                      rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
                    >
                      <Input placeholder="0123456789" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="dateOfBirth"
                      label="Ngày sinh"
                      rules={[{ required: true, message: "Vui lòng chọn ngày sinh!" }]}
                    >
                      <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày sinh" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="address" label="Địa chỉ">
                      <Input placeholder="Hà Nội" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="Ngày bắt đầu học"
                      tooltip="Ngày học sinh chính thức tham gia trung tâm."
                      rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu!" }]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        placeholder="Chọn ngày bắt đầu"
                        className="rounded-xl"
                        format="DD/MM/YYYY"
                        disabled={!!editingStudent}
                      />
                    </Form.Item>
                  </Col>
                  {editingStudent && (
                    <Col span={12}>
                      <Form.Item
                        name="endDate"
                        label="Ngày kết thúc học"
                        tooltip="Nếu endDate ≤ ngày hiện tại → tài khoản bị inactive. Nếu endDate trong tương lai → tài khoản sẽ bị cron tự động vô hiệu hóa khi đến ngày. Bỏ trống = hoạt động vô thời hạn."
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          placeholder="Bỏ trống = hoạt động mãi"
                          className="rounded-xl"
                          format="DD/MM/YYYY"
                        />
                      </Form.Item>
                    </Col>
                  )}
                </Row>

                {editingStudent && (
                  <>
                    {/* Active status banner */}
                    {(() => {
                      const active = isUserActive(editingStudent);
                      const endDate = editingStudent.endDate ? dayjs(editingStudent.endDate) : null;
                      const isScheduled = active && endDate && endDate.isAfter(dayjs());
                      const daysLeft = isScheduled ? endDate.diff(dayjs(), "day") : 0;

                      return (
                        <div className={`rounded-xl p-3 mb-4 text-sm flex items-center gap-2 ${!active
                          ? "bg-slate-50 border border-slate-200 text-slate-600"
                          : isScheduled
                            ? "bg-amber-50 border border-amber-200 text-amber-700"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          }`}>
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!active ? "bg-slate-400" : isScheduled ? "bg-amber-400" : "bg-emerald-400"
                            }`} />
                          {!active && (
                            <span>Tài khoản <strong>đã nghỉ</strong> (inactive){endDate && ` — kết thúc ngày ${endDate.format("DD/MM/YYYY")}`}</span>
                          )}
                          {active && isScheduled && (
                            <span>Tài khoản đang hoạt động — <strong>sẽ tự động nghỉ sau {daysLeft} ngày</strong> (ngày {endDate!.format("DD/MM/YYYY")})</span>
                          )}
                          {active && !isScheduled && (
                            <span>Tài khoản <strong>đang hoạt động</strong></span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-600 space-y-1">
                      <div className="font-semibold text-blue-700">ℹ️ Quy tắc trạng thái tài khoản:</div>
                      <ul className="list-disc pl-4 m-0 space-y-0.5">
                        <li><strong>endDate trống</strong> hoặc <strong>trong tương lai</strong> → Tài khoản <strong>active</strong> (đăng nhập được)</li>
                        <li><strong>endDate ≤ hôm nay</strong> → Tài khoản <strong>inactive</strong> (không đăng nhập được)</li>
                        <li>Hệ thống backend sẽ tự động kiểm tra và vô hiệu hóa tài khoản khi đến ngày kết thúc</li>
                      </ul>
                    </div>
                  </>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="parentFullName"
                      label="Họ và tên phụ huynh"
                      rules={[{ required: true, message: "Vui lòng nhập họ tên phụ huynh!" }]}
                    >
                      <Input placeholder="Nguyễn Văn B" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="citizenId"
                      label="Căn cước công dân (CCCD - 12 chữ số)"
                      rules={[
                        { pattern: /^\d{12}$/, message: "Số CCCD phải gồm đúng 12 chữ số!" }
                      ]}
                    >
                      <Input placeholder="Nhập 12 chữ số CCCD (tùy chọn)" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="centerId"
                  label="Trung tâm đăng ký"
                  rules={[{ required: true, message: "Vui lòng chọn trung tâm!" }]}
                >
                  <Select
                    placeholder="Chọn trung tâm"
                    className="rounded-xl"
                    onChange={(val) => {
                      setSelectedModalCenterId(val);
                      // Clear class selection if center changes to prevent mismatch
                      studentForm.setFieldsValue({ classIds: [] });
                    }}
                    options={centers.map(c => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>

                <Form.Item
                  name="classIds"
                  label="Lớp học tham gia"
                  rules={[{ required: true, message: "Chọn ít nhất 1 lớp học!" }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn lớp học (chọn trung tâm trước để lọc)"
                    style={{ width: "100%" }}
                    className="rounded-xl"
                    options={classes
                      .filter((c) => !selectedModalCenterId || c.centerId === selectedModalCenterId)
                      .map((c) => ({ label: c.name, value: c.id }))}
                  />
                </Form.Item>

                {!editingStudent && (
                  <Form.Item
                    name="password"
                    label="Mật khẩu tài khoản"
                    rules={[
                      { required: true, message: "Nhập mật khẩu!" },
                      { min: 8, message: "Mật khẩu phải tối thiểu từ 8 ký tự!" },
                    ]}
                  >
                    <Input.Password placeholder="Tối thiểu 8 ký tự" className="rounded-xl" />
                  </Form.Item>
                )}

              </Form>
            </Modal>

            {/* CREATE / EDIT ADMIN MODAL */}
            <Modal
              title={editingAdmin ? "Cập nhật Quản trị viên" : "Tạo Quản trị viên mới"}
              open={adminModalOpen}
              onCancel={() => {
                setAdminModalOpen(false);
                adminForm.resetFields();
              }}
              onOk={() => adminForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              width={650}
              centered
              styles={{
                body: {
                  maxHeight: "70vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "8px",
                },
              }}
              className="rounded-2xl"
            >
              <Form
                form={adminForm}
                layout="vertical"
                onFinish={handleAdminSubmit}
                className="pt-2"
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="code"
                      label="Mã quản trị viên"
                    >
                      <Input placeholder="Hệ thống tự sinh" disabled className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="fullName"
                      label="Họ và tên"
                      rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
                    >
                      <Input placeholder="Admin B" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[{ type: "email", message: "Email không hợp lệ!" }]}
                    >
                      <Input placeholder="admin@email.com" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại"
                      rules={[{ required: true, message: "Vui lòng nhập số điện thoại!" }]}
                    >
                      <Input placeholder="0123456789" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="dateOfBirth"
                      label="Ngày sinh"
                    >
                      <DatePicker style={{ width: "100%" }} placeholder="Chọn ngày sinh" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="address" label="Địa chỉ">
                      <Input placeholder="Hồ Chí Minh" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="citizenId"
                      label="Căn cước công dân (CCCD - 12 chữ số)"
                      rules={[
                        { pattern: /^\d{12}$/, message: "Số CCCD phải gồm đúng 12 chữ số!" }
                      ]}
                    >
                      <Input placeholder="Nhập 12 chữ số CCCD (tùy chọn)" className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="startDate"
                      label="Ngày bắt đầu làm việc"
                      tooltip="Ngày admin chính thức tham gia trung tâm."
                      rules={[{ required: true, message: "Vui lòng chọn ngày bắt đầu!" }]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        placeholder="Chọn ngày bắt đầu"
                        className="rounded-xl"
                        format="DD/MM/YYYY"
                        disabled={!!editingAdmin}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {editingAdmin && (
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="endDate"
                        label="Ngày kết thúc làm việc"
                        tooltip="Nếu endDate ≤ ngày hiện tại → tài khoản bị inactive. Nếu endDate trong tương lai → tài khoản sẽ bị cron tự động vô hiệu hóa khi đến ngày. Bỏ trống = hoạt động vô thời hạn."
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          placeholder="Bỏ trống = hoạt động mãi"
                          className="rounded-xl"
                          format="DD/MM/YYYY"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {editingAdmin && (
                  <>
                    {/* Active status banner */}
                    {(() => {
                      const active = isUserActive(editingAdmin);
                      const endDate = editingAdmin.endDate ? dayjs(editingAdmin.endDate) : null;
                      const isScheduled = active && endDate && endDate.isAfter(dayjs());
                      const daysLeft = isScheduled ? endDate.diff(dayjs(), "day") : 0;

                      return (
                        <div className={`rounded-xl p-3 mb-4 text-sm flex items-center gap-2 ${!active
                          ? "bg-slate-50 border border-slate-200 text-slate-600"
                          : isScheduled
                            ? "bg-amber-50 border border-amber-200 text-amber-700"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                          }`}>
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${!active ? "bg-slate-400" : isScheduled ? "bg-amber-400" : "bg-emerald-400"
                            }`} />
                          {!active && (
                            <span>Tài khoản <strong>đã nghỉ</strong> (inactive){endDate && ` — kết thúc ngày ${endDate.format("DD/MM/YYYY")}`}</span>
                          )}
                          {active && isScheduled && (
                            <span>Tài khoản đang hoạt động — <strong>sẽ tự động nghỉ sau {daysLeft} ngày</strong> (ngày {endDate!.format("DD/MM/YYYY")})</span>
                          )}
                          {active && !isScheduled && (
                            <span>Tài khoản <strong>đang hoạt động</strong></span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-600 space-y-1">
                      <div className="font-semibold text-blue-700">ℹ️ Quy tắc trạng thái tài khoản:</div>
                      <ul className="list-disc pl-4 m-0 space-y-0.5">
                        <li><strong>endDate trống</strong> hoặc <strong>trong tương lai</strong> → Tài khoản <strong>active</strong> (đăng nhập được)</li>
                        <li><strong>endDate ≤ hôm nay</strong> → Tài khoản <strong>inactive</strong> (không đăng nhập được)</li>
                        <li>Hệ thống backend sẽ tự động kiểm tra và vô hiệu hóa tài khoản khi đến ngày kết thúc</li>
                      </ul>
                    </div>
                  </>
                )}

                {!editingAdmin && (
                  <Form.Item
                    name="password"
                    label="Mật khẩu tài khoản"
                    rules={[
                      { required: true, message: "Nhập mật khẩu!" },
                      { min: 8, message: "Mật khẩu phải tối thiểu từ 8 ký tự!" },
                    ]}
                  >
                    <Input.Password placeholder="Tối thiểu 8 ký tự" className="rounded-xl" />
                  </Form.Item>
                )}

              </Form>
            </Modal>

            {/* RESET PASSWORD MODAL */}
            <Modal
              title="Khôi phục Mật khẩu Tài khoản"
              open={resetPasswordModalOpen}
              onCancel={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordResult(null);
              }}
              footer={null}
              className="rounded-2xl"
            >
              {!resetPasswordResult ? (
                <div className="pt-2">
                  <p className="text-slate-600 text-sm">
                    Xác nhận đặt lại mật khẩu cho tài khoản: <strong>{resetPasswordUser?.fullName}</strong> (Mã: {resetPasswordUser?.code})
                  </p>
                  <p className="text-slate-400 text-xs">
                    Hành động này sẽ tạo một mật khẩu tạm thời ngẫu nhiên để người dùng đăng nhập lại.
                  </p>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      onClick={() => {
                        setResetPasswordModalOpen(false);
                        setResetPasswordResult(null);
                      }}
                      className="rounded-xl"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      type="primary"
                      danger
                      onClick={handleConfirmResetPassword}
                      className="rounded-xl"
                    >
                      Xác nhận
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 space-y-4">
                  <p className="text-slate-600 text-sm m-0">Mật khẩu tạm thời mới của người dùng:</p>
                  <div className="flex gap-2">
                    <Input.Password value={resetPasswordResult} readOnly className="rounded-xl font-mono text-base" />
                    <Button
                      type="primary"
                      onClick={handleCopyPassword}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                    >
                      Sao chép
                    </Button>
                  </div>
                  <p className="text-amber-600 text-xs bg-amber-50 p-3 rounded-xl">
                    ⚠️ Hãy copy và chia sẻ mật khẩu mới này cho người dùng. Họ có thể đổi sang mật khẩu mong muốn sau khi đăng nhập thành công.
                  </p>
                  <Button
                    block
                    type="primary"
                    onClick={() => {
                      setResetPasswordModalOpen(false);
                      setResetPasswordResult(null);
                    }}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  >
                    Đóng lại
                  </Button>
                </div>
              )}
            </Modal>

            {/* CREATE / EDIT SPECIALIZATION MODAL */}
            <Modal
              title={editingSpecialization ? "Cập nhật Chuyên môn" : "Tạo Chuyên môn mới"}
              open={specializationModalOpen}
              onCancel={() => setSpecializationModalOpen(false)}
              onOk={() => specializationForm.submit()}
              okText="Lưu lại"
              cancelText="Hủy bỏ"
              className="rounded-2xl"
            >
              <Form
                form={specializationForm}
                layout="vertical"
                onFinish={handleSpecializationSubmit}
                className="pt-2"
              >
                <Form.Item
                  name="code"
                  label="Mã chuyên môn"
                  rules={[
                    { required: true, message: "Vui lòng nhập mã chuyên môn!" },
                    { min: 2, message: "Mã phải từ 2 ký tự!" }
                  ]}
                >
                  <Input placeholder="Ví dụ: ielts" disabled={!!editingSpecialization} className="rounded-xl" />
                </Form.Item>

                <Form.Item
                  name="name"
                  label="Tên chuyên môn"
                  rules={[{ required: true, message: "Vui lòng nhập tên chuyên môn!" }]}
                >
                  <Input placeholder="Ví dụ: IELTS" className="rounded-xl" />
                </Form.Item>

                <Form.Item name="description" label="Mô tả">
                  <Input.TextArea placeholder="Nhập mô tả ngắn về chuyên môn..." rows={3} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* IMAGE PREVIEW MODAL */}
            <Modal
              open={previewOpen}
              title={previewTitle}
              footer={null}
              onCancel={() => setPreviewOpen(false)}
              centered
              className="rounded-2xl"
              styles={{
                body: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "10px",
                }
              }}
            >
              <SecureImage src={previewImage} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </Modal>

          </div>
        </Spin>
      </div>
    </ConfigProvider>
  );
}
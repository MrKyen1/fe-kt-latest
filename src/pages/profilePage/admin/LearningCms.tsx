import { CmsHeaderFilterContext, type CmsFilters } from "../../../components/CmsHeaderFilters";
import { useLearningCmsSummary } from "../../../hooks/useLearningCmsSummary";
import { useServerPagination } from "../../../hooks/useServerPagination";
import { ServerSelect, LearningLookupScope } from "../../../components/ServerSelect";
// ============================================================
// LearningCms — Main Orchestrator
// ============================================================
// This file owns:
//   • All state (data, UI, form instances, modals)
//   • All async handlers (CRUD, reorder, version history)
//   • Composition of sub-components and modals
//
// It does NOT contain:
//   • Inline column definitions (→ tab components)
//   • Inline modal JSX (→ modal components)
//   • Constants / static data (→ constants.ts)
//   • Pure render helpers (→ sub-components)
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  ConfigProvider,
  Divider,
  Form,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  BookOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { BookOpenIcon, Pencil, Trash2 } from "lucide-react";

import { learningCmsService } from "../../../services/learningCmsService";
import { academicService } from "../../../services/academicService";
import { useAuth } from "../../../contexts/AuthContext";
import { Can } from "../../../components/Can";
import { getErrorMessage } from "../../../services/apiClient";
import { formatTextForBackend } from "../../../utils/textFormatters";

// ── Constants ────────────────────────────────────────────────
import {
  CHOICE_TYPES,
  LIST_LIMIT,
  PAGE_SIZE_CURRICULUMS,
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_EXAMS,
  PAGE_SIZE_MEDIA,
  PAGE_SIZE_PASSAGES,
  PAGE_SIZE_QUESTIONS,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
} from "./learningCms/constants";

// ── Tab components ───────────────────────────────────────────
import TaxonomyTab from "./learningCms/components/TaxonomyTab";
import MediaTab from "./learningCms/components/MediaTab";
import PassagesTab from "./learningCms/components/PassagesTab";
import QuestionsTab from "./learningCms/components/QuestionsTab";
import { invalidateQuestionDetailCache } from "./learningCms/components/QuestionPopoverContent";
import ExamsTab from "./learningCms/components/ExamsTab";
import CurriculumsTab from "./learningCms/components/CurriculumsTab";

// ── Modal components ─────────────────────────────────────────
import TaxonomyModal from "./learningCms/components/modals/TaxonomyModal";
import MediaUploadModal from "./learningCms/components/modals/MediaUploadModal";
import PassageFormModal from "./learningCms/components/modals/PassageFormModal";
import QuestionFormModal from "./learningCms/components/modals/QuestionFormModal";
import ExamFormModal from "./learningCms/components/modals/ExamFormModal";
import CurriculumFormModal from "./learningCms/components/modals/CurriculumFormModal";
import ExamVersionsModal from "./learningCms/components/modals/ExamVersionsModal";
import QuestionVersionsModal from "./learningCms/components/modals/QuestionVersionsModal";
import ManageQuestionsModal from "./learningCms/components/modals/ManageQuestionsModal";
import ManageExamsModal from "./learningCms/components/modals/ManageExamsModal";
import MediaPreviewModal from "./learningCms/components/modals/MediaPreviewModal";
import { useAppImagePreview } from "../../../components/AppImagePreview";

const { Title, Text } = Typography;

// ── Ant Design theme ─────────────────────────────────────────

const ANT_THEME = {
  token: {
    borderRadius: 12,
    colorPrimary: "#4f46e5",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  components: {
    Table: {
      headerBg: "#f8fafc",
      headerColor: "#475569",
      rowHoverBg: "#f1f5f9",
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Returns the Ant Design tag colour for a given status string.
 * Extracted so it can be used by multiple sub-components if needed.
 */
export function statusTag(status: string) {
  if (status === "published")
    return <Tag color="success" className="rounded-full border-none text-xs font-semibold">Đã duyệt</Tag>;
  if (status === "archived")
    return <Tag color="default" className="rounded-full border-none text-xs font-semibold">Lưu trữ</Tag>;
  return <Tag color="warning" className="rounded-full border-none text-xs font-semibold">Nháp</Tag>;
}

/**
 * Returns the correct error message string from an Axios-style error or API error.
 * Prioritizes backend response message (even if array of validation errors),
 * then backend error, then network/client error message, and finally fallback.
 */
const extractErrorMsg = getErrorMessage;

// ============================================================
// Main Component
// ============================================================

export default function LearningCms() {
  const { user, hasPermission } = useAuth();
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);


  const location = useLocation();
  const navigate = useNavigate();

  const rolePrefix = user?.role === "teacher" ? "teacher" : "admin";

  const currentSubPath = useMemo(() => {
    const cmsPath = location.pathname.split("/cms")[1] || "";
    const parts = cmsPath.split("/").filter(Boolean);
    let subjectId: string | undefined = undefined;
    let tab = "taxonomy";
    let taxTab = "levels";

    if (parts[0] === "subjects" && parts[1]) {
      subjectId = parts[1];
      tab = parts[2] || "taxonomy";
      if (tab === "taxonomy") {
        taxTab = parts[3] || "levels";
      }
    } else {
      tab = parts[0] || "taxonomy";
      if (tab === "taxonomy") {
        taxTab = parts[1] || "levels";
      }
    }

    return { subjectId, tab, taxTab };
  }, [location.pathname]);

  const activeTab = currentSubPath.tab;
  const taxTab = currentSubPath.taxTab;
  const urlSubjectId = currentSubPath.subjectId;

  // ── Data states ────────────────────────────────────────────
  const [levels, setLevels] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [passages, setPassages] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);

  // ── Pagination & Filter states ─────────────────────────────
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsPageSize, setQuestionsPageSize] = useState(PAGE_SIZE_QUESTIONS);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [passagesPage, setPassagesPage] = useState(1);
  const [passagesPageSize, setPassagesPageSize] = useState(PAGE_SIZE_PASSAGES);
  const [passagesTotal, setPassagesTotal] = useState(0);
  const [passagesLoading, setPassagesLoading] = useState(false);

  const [examsPage, setExamsPage] = useState(1);
  const [examsPageSize, setExamsPageSize] = useState(PAGE_SIZE_EXAMS);
  const [examsTotal, setExamsTotal] = useState(0);
  const [examsLoading, setExamsLoading] = useState(false);

  const [curriculumsPage, setCurriculumsPage] = useState(1);
  const [curriculumsPageSize, setCurriculumsPageSize] = useState(PAGE_SIZE_CURRICULUMS);
  const [curriculumsTotal, setCurriculumsTotal] = useState(0);
  const [curriculumsLoading, setCurriculumsLoading] = useState(false);

  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(PAGE_SIZE_MEDIA);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [mediaLoading, setMediaLoading] = useState(false);

  const [taxPage, setTaxPage] = useState(1);
  const [taxPageSize, setTaxPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [taxTotal, setTaxTotal] = useState(0);

  const [allQuestionsForModal, setAllQuestionsForModal] = useState<any[]>([]);

  const profileSubjects = user?.role === "teacher" ? user.teacherProfile?.specializations || [] : [];
  const useProfileSubjects = profileSubjects.length > 0;
  const subjectPage = useServerPagination("/specializations", { isActive: true }, 20,
    !!user && hasPermission("specializations.read") && !useProfileSubjects);

  const selectedSpecializationId = useMemo(() => {
    if (urlSubjectId) {
      return urlSubjectId;
    }
    return specializations[0]?.id || undefined;
  }, [urlSubjectId, specializations]);

  const cmsSummary = useLearningCmsSummary(selectedSpecializationId, subjectsLoaded && !!selectedSpecializationId);
  const tabCount = (field: "questions" | "exams" | "curriculums" | "draftExams") =>
    cmsSummary.data?.[field] ?? (cmsSummary.error ? "?" : "…");

  const subjectOptions = useMemo(() => {
    return specializations.map((spec) => ({
      value: spec.id,
      label: spec.name,
      code: spec.code,
      searchValue: `${spec.name} ${spec.code || ""}`,
    }));
  }, [specializations]);

  const handleSubjectChange = (newSubjectId: string) => {
    navigate(`/${rolePrefix}/cms/subjects/${newSubjectId}/${activeTab}${activeTab === "taxonomy" ? `/${taxTab}` : ""}`);
  };

  const setActiveTab = (tab: string) => {
    const sId = selectedSpecializationId || (specializations[0]?.id ?? "");
    if (sId) {
      if (tab === "taxonomy") {
        navigate(`/${rolePrefix}/cms/subjects/${sId}/taxonomy/${taxTab}`);
      } else {
        navigate(`/${rolePrefix}/cms/subjects/${sId}/${tab}`);
      }
    } else {
      if (tab === "taxonomy") {
        navigate(`/${rolePrefix}/cms/taxonomy/${taxTab}`);
      } else {
        navigate(`/${rolePrefix}/cms/${tab}`);
      }
    }
  };

  const setTaxTab = (subTab: string) => {
    const sId = selectedSpecializationId || (specializations[0]?.id ?? "");
    if (sId) {
      navigate(`/${rolePrefix}/cms/subjects/${sId}/taxonomy/${subTab}`);
    } else {
      navigate(`/${rolePrefix}/cms/taxonomy/${subTab}`);
    }
  };

  // ── Taxonomy search / filter ───────────────────────────────
  const [taxLoading, setTaxLoading] = useState(false);
  const [filteredLevels, setFilteredLevels] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<any[]>([]);
  const [filteredTags, setFilteredTags] = useState<any[]>([]);

  // ── Modal visibility ───────────────────────────────────────
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const { showPreview, previewElement } = useAppImagePreview();

  const handlePreviewAsset = (a: any) => {
    if (!a) return;
    const isImg = a.type === "image" || a.mimeType?.startsWith("image");
    if (isImg && a.url) {
      showPreview(a.url);
    } else {
      setPreviewAsset(a);
      setPreviewVisible(true);
    }
  };
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examVersionsModalOpen, setExamVersionsModalOpen] = useState(false);
  const [questionVersionsModalOpen, setQuestionVersionsModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [manageQuestionsOpen, setManageQuestionsOpen] = useState(false);
  const [manageExamsOpen, setManageExamsOpen] = useState(false);

  // ── Editing / selected state ───────────────────────────────
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingExamInitialCurriculumId, setEditingExamInitialCurriculumId] = useState<string | undefined>(undefined);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<any>(null);
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("multiple_choice");
  const [isDuplicatingQuestion, setIsDuplicatingQuestion] = useState(false);

  // ── Version history ────────────────────────────────────────
  const [examVersions, setExamVersions] = useState<any[]>([]);
  const [viewingExam, setViewingExam] = useState<any>(null);
  const [questionVersions, setQuestionVersions] = useState<any[]>([]);
  const [viewingQuestion, setViewingQuestion] = useState<any>(null);

  // ── Exam-question filter state (lifted for ManageQuestionsModal) ──
  const [examQSearch, setExamQSearch] = useState("");
  const [examQTypeFilter, setExamQTypeFilter] = useState<string | undefined>(undefined);
  const [examQSkillFilter, setExamQSkillFilter] = useState<string | undefined>(undefined);
  const [examQLevelFilter, setExamQLevelFilter] = useState<string | undefined>(undefined);
  const [examQTopicFilter, setExamQTopicFilter] = useState<string | undefined>(undefined);
  const [examQTagFilter, setExamQTagFilter] = useState<string | undefined>(undefined);

  // Cache of fully-fetched question details (for hover popover in ManageQuestionsModal)
  const [questionDetails, setQuestionDetails] = useState<Record<string, any>>({});

  // ── Media upload state ─────────────────────────────────────
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mediaAlt, setMediaAlt] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  // ── Form instances ─────────────────────────────────────────
  const [taxForm] = Form.useForm();
  const [passageForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [examForm] = Form.useForm();
  const [curriculumForm] = Form.useForm();

  // ── Taxonomy service router ────────────────────────────────

  const getTaxService = (type: string) => {
    switch (type) {
      case "levels": return learningCmsService.levels;
      case "skills": return learningCmsService.skills;
      case "topics": return learningCmsService.topics;
      case "tags": default: return learningCmsService.tags;
    }
  };

  const getTaxName = (tab: string): string => {
    switch (tab) {
      case "levels": return "Cấp độ";
      case "skills": return "Kỹ năng";
      case "topics": return "Chủ đề";
      default: return "Thẻ gắn";
    }
  };

  const getTaxData = () => {
    switch (taxTab) {
      case "levels": return filteredLevels;
      case "skills": return filteredSkills;
      case "topics": return filteredTopics;
      default: return filteredTags;
    }
  };

  const getSearchPlaceholder = (): string => {
    switch (taxTab) {
      case "levels": return "Tìm kiếm Level (mã, tên)...";
      case "skills": return "Tìm kiếm kỹ năng (mã, tên)...";
      case "topics": return "Tìm kiếm chủ đề (mã, tên)...";
      default: return "Tìm kiếm thẻ gắn (mã, tên)...";
    }
  };

  // ── Media helpers ──────────────────────────────────────────

  const getFilteredMedia = () => {
    if (currentQuestionType === "image_choice")
      return media.filter((m) => m.type === "image" || m.mimeType?.startsWith("image"));
    if (currentQuestionType === "audio_choice" || currentQuestionType === "audio_image_choice" || currentQuestionType === "audio_fill_blanks")
      return media.filter((m) => m.type === "audio" || m.mimeType?.startsWith("audio"));
    return media;
  };

  const getAvailableRoles = () => {
    if (currentQuestionType === "image_choice")
      return [{ value: "prompt_image", label: "Hình ảnh đề bài" }];
    if (currentQuestionType === "audio_choice" || currentQuestionType === "audio_image_choice" || currentQuestionType === "audio_fill_blanks")
      return [{ value: "prompt_audio", label: "Âm thanh đề bài" }];
    return [
      { value: "prompt_audio", label: "Âm thanh đề bài" },
      { value: "prompt_image", label: "Hình ảnh đề bài" },
    ];
  };

  // ── Filter reset ───────────────────────────────────────────

  const resetExamQFilters = () => {
    setExamQSearch("");
    setExamQTypeFilter(undefined);
    setExamQSkillFilter(undefined);
    setExamQLevelFilter(undefined);
    setExamQTopicFilter(undefined);
    setExamQTagFilter(undefined);
  };

  // ── Taxonomy columns (built with closures over state) ──────

  const taxColumns = [
    {
      title: "Tên danh mục",
      dataIndex: "name",
      render: (val: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">{val}</div>
          <div className="text-xs text-slate-400 font-mono">{record.code}</div>
          {record.rank !== undefined && (
            <div className="text-xs text-indigo-500 mt-0.5">Thứ tự: {record.rank}</div>
          )}
        </div>
      ),
    },
    taxTab === "topics" ? {
      title: "Chủ đề cha",
      dataIndex: "parentId",
      render: (val: string, record: any) => {
        const parent = record.parent || topics.find((t) => t.id === val);
        return parent
          ? <Tag color="blue" className="rounded">{parent.name}</Tag>
          : <span className="text-slate-400">—</span>;
      },
    } : null,
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Can perform="learning.write">
            <Button type="text" size="small"
              icon={<Pencil size={14} className="text-slate-400 hover:text-indigo-600" />}
              onClick={() => handleTaxEdit(record)}
            />
          </Can>
          <Can perform="learning.delete">
            <Button type="text" size="small" danger
              icon={<Trash2 size={14} className="text-slate-400 hover:text-rose-600" />}
              onClick={() => handleTaxDelete(record)}
            />
          </Can>
        </Space>
      ),
    },
  ].filter(Boolean) as any[];

  // ============================================================
  // DATA LOADING
  // ============================================================

  const resource = activeTab === "taxonomy" ? taxTab : activeTab === "media" ? "media-assets" : activeTab === "passages" ? "reading-passages" : activeTab;
  const [cmsFilters, setCmsFilters] = useState<Record<string, CmsFilters>>({});
  const filterScope = JSON.stringify([selectedSpecializationId, resource]);
  const appliedCmsFilters = cmsFilters[filterScope] || {};
  const applyCmsFilters = (patch: CmsFilters) => setCmsFilters(previous => ({ ...previous, [filterScope]: { ...previous[filterScope], ...patch } }));
  const cmsQuery = Object.fromEntries(Object.entries(appliedCmsFilters).filter(([, value]) => value.length > 0).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
  const resourcePage = useServerPagination(`/learning/${resource}`, {
    specializationId: resource === "tags" || resource === "media-assets" ? undefined : selectedSpecializationId,
    ...cmsQuery,
    type: activeTab === "media" && mediaTypeFilter !== "all" ? mediaTypeFilter : undefined,
  }, PAGE_SIZE_DEFAULT, subjectsLoaded && !!selectedSpecializationId);
  useEffect(() => {
    const data = resourcePage.data;
    setPassagesLoading(activeTab === "passages" && resourcePage.loading);
    setMediaLoading(activeTab === "media" && resourcePage.loading);
    setQuestionsLoading(activeTab === "questions" && resourcePage.loading);
    setExamsLoading(activeTab === "exams" && resourcePage.loading);
    setCurriculumsLoading(activeTab === "curriculums" && resourcePage.loading);
    if (resourcePage.error) message.error(resourcePage.error.message);
    const { current, pageSize } = resourcePage.pagination;
    switch (activeTab) {
      case "taxonomy":
        if (taxTab === "levels") { setLevels(data); setFilteredLevels(data); }
        if (taxTab === "skills") { setSkills(data); setFilteredSkills(data); }
        if (taxTab === "topics") { setTopics(data); setFilteredTopics(data); }
        if (taxTab === "tags") { setTags(data); setFilteredTags(data); }
        setTaxPage(current); setTaxPageSize(pageSize); setTaxTotal(resourcePage.total); break;
      case "media": setMedia(data); setMediaPage(current); setMediaPageSize(pageSize); setMediaTotal(resourcePage.total); break;
      case "passages": setPassages(data); setPassagesPage(current); setPassagesPageSize(pageSize); setPassagesTotal(resourcePage.total); break;
      case "questions": setQuestions(data); setQuestionsPage(current); setQuestionsPageSize(pageSize); setQuestionsTotal(resourcePage.total); break;
      case "exams": setExams(data); setExamsPage(current); setExamsPageSize(pageSize); setExamsTotal(resourcePage.total); break;
      case "curriculums": setCurriculums(data); setCurriculumsPage(current); setCurriculumsPageSize(pageSize); setCurriculumsTotal(resourcePage.total); break;
    }
  }, [resourcePage.data, resourcePage.total, resourcePage.loading, resourcePage.error, activeTab, taxTab]);
  const loadTaxonomyData = async (_tab: string, _search = "", page = taxPage, size = taxPageSize) => resourcePage.pagination.onChange(page, size);
  const loadMediaData = async (page = mediaPage, size = mediaPageSize) => resourcePage.pagination.onChange(page, size);
  const loadQuestionsData = async (page = questionsPage, size = questionsPageSize) => resourcePage.pagination.onChange(page, size);
  const loadPassagesData = async (page = passagesPage, size = passagesPageSize) => resourcePage.pagination.onChange(page, size);
  const loadExamsData = async (page = examsPage, size = examsPageSize) => resourcePage.pagination.onChange(page, size);
  const loadCurriculumsData = async (page = curriculumsPage, size = curriculumsPageSize) => resourcePage.pagination.onChange(page, size);
  const handleQuestionsPageChange = (page: number, size: number) => resourcePage.pagination.onChange(page, size);
  const handlePassagesPageChange = handleQuestionsPageChange;
  const handleExamsPageChange = handleQuestionsPageChange;
  const handleCurriculumsPageChange = handleQuestionsPageChange;
  const handleMediaTypeFilterChange = (value: string) => setMediaTypeFilter(value);
  const handleMediaPageChange = handleQuestionsPageChange;
  const handleTaxPageChange = handleQuestionsPageChange;
  const loadAllData = async () => { resourcePage.reload(); };

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    if (!user || (subjectPage.loading && !useProfileSubjects)) return;
    const specs = useProfileSubjects ? profileSubjects : subjectPage.data;
    setSpecializations(specs);
    setSubjectsLoaded(true);
    if (subjectPage.error) message.error(extractErrorMsg(subjectPage.error, "Tải danh sách môn học thất bại"));
    if (specs.length > 0 && !urlSubjectId) {
      navigate(`/${rolePrefix}/cms/subjects/${specs[0].id}/${activeTab}${activeTab === "taxonomy" ? `/${taxTab}` : ""}`, { replace: true });
    }
  }, [user, subjectPage.data, subjectPage.loading, subjectPage.error]);

  // A bookmarked subject may be outside the first option page.
  const needsSubjectDetail = !!urlSubjectId && subjectsLoaded && !subjectPage.loading
    && !specializations.some(spec => spec.id === urlSubjectId) && hasPermission("specializations.read");
  useEffect(() => {
    if (!needsSubjectDetail || !urlSubjectId) return;
    let current = true;
    academicService.specializations.get(urlSubjectId)
      .then(spec => { if (current) setSpecializations(previous => [...previous.filter(item => item.id !== spec.id), spec]); })
      .catch(error => { if (current) message.error(extractErrorMsg(error, "Tải môn học thất bại")); });
    return () => { current = false; };
  }, [urlSubjectId, needsSubjectDetail, subjectPage.generation, user?.id]);



  // ============================================================
  // TAXONOMY CRUD
  // ============================================================

  const handleTaxCreate = () => {
    setEditingItem(null);
    taxForm.resetFields();
    setTaxModalOpen(true);
  };

  const handleTaxEdit = (record: any) => {
    setEditingItem(record);
    taxForm.setFieldsValue(record);
    setTaxModalOpen(true);
  };

  const handleTaxDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa danh mục",
      content: `Xóa danh mục "${record.name}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await getTaxService(taxTab).remove(record.id);
          message.success("Xóa thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  const handleTaxSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await getTaxService(taxTab).update(editingItem.id, values);
        message.success("Cập nhật thành công");
      } else {
        const payload = taxTab !== "tags"
          ? { ...values, specializationId: selectedSpecializationId }
          : values;
        await getTaxService(taxTab).create(payload);
        message.success("Tạo mới thành công");
      }
      loadAllData();
      setTaxModalOpen(false);
    } catch (error: any) {
      const err = error?.response?.data ?? error;
      if (err.statusCode === 409 && err.errorCode === "DUPLICATE_INACTIVE_RECORD") {
        const itemId = err.details?.id;
        const taxName = getTaxName(taxTab);
        if (itemId) {
          Modal.confirm({
            title: `Khôi phục ${taxName}`,
            content: `"${values.name}" đã tồn tại nhưng đang ở trạng thái ngừng hoạt động. Bạn có muốn khôi phục lại không?`,
            okText: "Khôi phục",
            cancelText: "Hủy bỏ",
            onOk: async () => {
              try {
                await getTaxService(taxTab).reactivate(itemId);
                await getTaxService(taxTab).update(itemId, values);
                message.success(`Khôi phục và cập nhật ${taxName.toLowerCase()} thành công`);
                loadAllData();
                setTaxModalOpen(false);
                taxForm.resetFields();
              } catch (reactivateErr: any) {
                message.error(extractErrorMsg(reactivateErr, "Khôi phục thất bại"));
              }
            },
          });
          return;
        }
      }
      message.error(extractErrorMsg(error));
    }
  };

  // ============================================================
  // MEDIA CRUD
  // ============================================================

  const handleMediaUpload = async () => {
    if (!uploadFile) { message.warning("Vui lòng chọn tệp để tải lên!"); return; }
    try {
      setUploadLoading(true);
      await learningCmsService.mediaAssets.upload(uploadFile, mediaAlt);
      message.success("Tải lên tệp thành công");
      setUploadFile(null);
      setMediaAlt("");
      setMediaModalOpen(false);
      loadAllData();
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Tải lên tệp thất bại"));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleUploadQuestionMedia = async (file: File, altText?: string) => {
    const asset = await learningCmsService.mediaAssets.upload(file, altText);
    setMedia((prev) => [asset, ...prev]);
    return asset;
  };

  const handleMediaDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa tệp phương tiện",
      content: "Bạn có chắc chắn muốn xóa tệp này?",
      okText: "Xóa", cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.mediaAssets.remove(record.id);
          message.success("Xóa tệp thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  // ============================================================
  // READING PASSAGES CRUD
  // ============================================================

  const handlePassageCreate = () => {
    setEditingItem(null);
    passageForm.resetFields();
    setPassageModalOpen(true);
  };

  const handlePassageEdit = (record: any) => {
    setEditingItem(record);
    passageForm.setFieldsValue({
      title: record.title, content: record.content,
      source: record.source, levelId: record.levelId,
    });
    setPassageModalOpen(true);
  };

  const handlePassageDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa bài đọc",
      content: `Xóa bài đọc "${record.title}"?`,
      okText: "Xóa", cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.readingPassages.remove(record.id);
          message.success("Xóa thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  const handlePassageSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await learningCmsService.readingPassages.update(editingItem.id, values);
        message.success("Cập nhật bài đọc thành công");
      } else {
        await learningCmsService.readingPassages.create({ ...values, specializationId: selectedSpecializationId });
        message.success("Tạo bài đọc thành công");
      }
      loadAllData();
      setPassageModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
    }
  };

  // ============================================================
  // QUESTIONS CRUD
  // ============================================================

  const handleQuestionCreate = () => {
    setEditingItem(null);
    setIsDuplicatingQuestion(false);
    setCurrentQuestionType("multiple_choice");
    questionForm.resetFields();
    questionForm.setFieldsValue({
      type: "multiple_choice",
      status: "draft",
      options: [
        { label: "A", content: "", isCorrect: false, orderIndex: 0 },
        { label: "B", content: "", isCorrect: false, orderIndex: 1 },
        { label: "C", content: "", isCorrect: false, orderIndex: 2 },
        { label: "D", content: "", isCorrect: false, orderIndex: 3 },
      ],
      mediaIds: [],
    });
    setQuestionModalOpen(true);
  };

  const handleQuestionEdit = async (record: any) => {
    try {
      const fullRecord = await learningCmsService.questions.get(record.id);
      setEditingItem(fullRecord);
      setIsDuplicatingQuestion(false);
      setCurrentQuestionType(fullRecord.type);

      const detailFields: any = {};
      if (fullRecord.detail) {
        Object.assign(detailFields, fullRecord.detail);
        if (fullRecord.type === "word_ordering" && Array.isArray(fullRecord.detail.correctTokens)) {
          detailFields.correctTokens = fullRecord.detail.correctTokens.join(" ");
        }
        if ((fullRecord.type === "sentence_rewrite" || fullRecord.type === "hint_rewrite")
          && Array.isArray(fullRecord.detail.acceptedAnswers)) {
          detailFields.acceptedAnswers = fullRecord.detail.acceptedAnswers.join("\n");
        }
        if (fullRecord.type === "matching" && Array.isArray(fullRecord.detail.pairs)) {
          detailFields.pairs = fullRecord.detail.pairs.map((p: any) => ({
            leftText: p.leftText ?? "",
            rightText: p.rightText ?? "",
            leftMediaId: p.leftMediaId || p.leftMedia?.id,
            leftMediaVal: (p.leftMediaId || p.leftMedia) ? {
              mediaId: p.leftMediaId || p.leftMedia?.id,
              previewUrl: p.leftMedia?.url,
              fileName: p.leftMedia?.name,
              fileType: p.leftMedia?.type ?? (p.leftMedia?.mimeType?.startsWith("image") ? "image" : "audio"),
            } : undefined,
            rightMediaId: p.rightMediaId || p.rightMedia?.id,
            orderIndex: p.orderIndex,
          }));
        }
        if (fullRecord.type === "audio_fill_blanks") {
          const det = fullRecord.detail as any;
          detailFields.passageText = det?.passageText;
          detailFields.gradingMode = det?.gradingMode ?? "normalized";
          detailFields.blanks = (det?.blanks ?? []).map((b: any) => ({
            id: b.id,
            acceptedAnswers: Array.isArray(b.acceptedAnswers)
              ? b.acceptedAnswers.join(", ")
              : (b.acceptedAnswers ?? ""),
          }));
        }
      }

      const mediaIds = (fullRecord.media ?? []).map((m: any) => ({
        mediaId: m.mediaId ?? m.media?.id,
        role: m.role,
        orderIndex: m.orderIndex,
      }));

      const resolveEditablePrompt = (rec: any) => {
        if (rec.type === "error_correction" && rec.detail?.incorrectSentence) {
          return rec.detail.incorrectSentence;
        }
        if (
          (rec.type === "sentence_rewrite" || rec.type === "hint_rewrite") &&
          rec.detail?.sourceSentence
        ) {
          const p = (rec.prompt ?? "").trim();
          const s = String(rec.detail.sourceSentence).trim();
          if (!p) return s;
          if (s && p !== s && !p.includes(s)) return `${p}\n${s}`;
        }
        return rec.prompt;
      };

      setQuestionModalOpen(true);
      questionForm.setFieldsValue({
        type: fullRecord.type,
        prompt: resolveEditablePrompt(fullRecord),
        instruction: fullRecord.instruction,
        explanation: fullRecord.explanation,
        difficultyLevelId: fullRecord.difficultyLevelId,
        skillId: fullRecord.skillId,
        topicId: fullRecord.topicId,
        tagIds: (fullRecord.tags ?? []).map((t: any) => t.id),
        options: (fullRecord.options ?? []).map((o: any) => ({
          ...o,
          mediaId: o.mediaId || o.media?.id,
          mediaVal: (o.mediaId || o.media) ? {
            mediaId: o.mediaId || o.media?.id,
            previewUrl: o.media?.url,
            fileName: o.media?.name,
            fileType: "image",
          } : undefined,
        })),
        mediaIds,
        ...detailFields,
      });
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Không thể tải chi tiết câu hỏi"));
    }
  };

  const handleQuestionDuplicate = async (record: any) => {
    try {
      const hide = message.loading("Đang sao chép dữ liệu câu hỏi...", 0);
      const cloneData = await learningCmsService.questions.duplicate(record.id);
      hide();

      setEditingItem(null);
      setIsDuplicatingQuestion(true);
      setCurrentQuestionType(cloneData.type);

      const detailFields: any = {};
      if (cloneData.detail) {
        Object.assign(detailFields, cloneData.detail);
        if (cloneData.type === "word_ordering" && Array.isArray((cloneData.detail as any).correctTokens)) {
          detailFields.correctTokens = (cloneData.detail as any).correctTokens.join(" ");
        }
        if (
          (cloneData.type === "sentence_rewrite" || cloneData.type === "hint_rewrite") &&
          Array.isArray((cloneData.detail as any).acceptedAnswers)
        ) {
          detailFields.acceptedAnswers = (cloneData.detail as any).acceptedAnswers.join("\n");
        }
        if (cloneData.type === "matching" && Array.isArray((cloneData.detail as any)?.pairs)) {
          detailFields.pairs = (cloneData.detail as any).pairs.map((p: any) => ({
            leftText: p.leftText ?? "",
            rightText: p.rightText ?? "",
            leftMediaId: p.leftMediaId || p.leftMedia?.id,
            leftMediaVal: (p.leftMediaId || p.leftMedia) ? {
              mediaId: p.leftMediaId || p.leftMedia?.id,
              previewUrl: p.leftMedia?.url,
              fileName: p.leftMedia?.name,
              fileType: p.leftMedia?.type ?? (p.leftMedia?.mimeType?.startsWith("image") ? "image" : "audio"),
            } : undefined,
            rightMediaId: p.rightMediaId || p.rightMedia?.id,
            orderIndex: p.orderIndex,
          }));
        }
        if (cloneData.type === "audio_fill_blanks") {
          detailFields.passageText = (cloneData.detail as any)?.passageText;
          detailFields.gradingMode = (cloneData.detail as any)?.gradingMode ?? "normalized";
          detailFields.blanks = ((cloneData.detail as any)?.blanks ?? []).map((b: any) => ({
            id: b.id,
            acceptedAnswers: Array.isArray(b.acceptedAnswers)
              ? b.acceptedAnswers.join(", ")
              : (b.acceptedAnswers ?? ""),
          }));
        }
      }

      const mediaIds = (cloneData.mediaIds ?? []).map((m: any) => ({
        mediaId: m.mediaId ?? m.media?.id,
        role: m.role,
        orderIndex: m.orderIndex,
      }));

      questionForm.resetFields();
      const clonePrompt = (() => {
        if (cloneData.type === "error_correction" && (cloneData.detail as any)?.incorrectSentence) {
          return (cloneData.detail as any).incorrectSentence;
        }
        if (
          (cloneData.type === "sentence_rewrite" || cloneData.type === "hint_rewrite") &&
          (cloneData.detail as any)?.sourceSentence
        ) {
          const p = (cloneData.prompt ?? "").trim();
          const s = String((cloneData.detail as any).sourceSentence).trim();
          if (!p) return s;
          if (s && p !== s && !p.includes(s)) return `${p}\n${s}`;
        }
        return cloneData.prompt;
      })();
      questionForm.setFieldsValue({
        type: cloneData.type,
        prompt: clonePrompt,
        instruction: cloneData.instruction,
        explanation: cloneData.explanation,
        difficultyLevelId: cloneData.difficultyLevelId,
        skillId: cloneData.skillId,
        topicId: cloneData.topicId,
        tagIds: cloneData.tagIds ?? [],
        options: (cloneData.options ?? []).map((o: any) => ({
          ...o,
          mediaId: o.mediaId || o.media?.id,
          mediaVal: (o.mediaId || o.media) ? {
            mediaId: o.mediaId || o.media?.id,
            previewUrl: o.media?.url,
            fileName: o.media?.name,
            fileType: "image",
          } : undefined,
        })),
        mediaIds,
        ...detailFields,
      });

      setQuestionModalOpen(true);
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Không thể nhân bản câu hỏi"));
    }
  };

  const handleQuestionDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa câu hỏi",
      content: "Bạn có chắc chắn muốn xóa câu hỏi này?",
      okText: "Xóa", cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.questions.remove(record.id);
          message.success("Xóa thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  const handleQuestionSubmit = async (values: any) => {
    const qType = values.type;

    if (CHOICE_TYPES.includes(qType)) {
      const options = values.options ?? [];
      if (options.length < 2) {
        message.error({ content: "Câu hỏi trắc nghiệm phải có ít nhất 2 phương án trả lời!", key: "question-form-validation-error" });
        questionForm.scrollToField(["options"], { behavior: "smooth", block: "center" });
        return;
      }
      const hasCorrect = options.some((o: any) => o.isCorrect);
      if (!hasCorrect) {
        message.error({ content: "Vui lòng chọn ít nhất một đáp án đúng cho câu hỏi!", key: "question-form-validation-error" });
        questionForm.scrollToField(["options", 0, "isCorrect"], { behavior: "smooth", block: "center", focus: true });
        return;
      }
      if (qType === "true_false") {
        if (options.length !== 2) {
          message.error({ content: "Câu hỏi Đúng / Sai phải có chính xác 2 đáp án!", key: "question-form-validation-error" });
          return;
        }
        const correctCount = options.filter((o: any) => o.isCorrect).length;
        if (correctCount !== 1) {
          message.error({ content: "Câu hỏi Đúng / Sai phải có đúng 1 đáp án chính xác!", key: "question-form-validation-error" });
          return;
        }
      }
      if (qType === "audio_image_choice") {
        const hasMissingImage = options.some((o: any) => !o.mediaId);
        if (hasMissingImage) {
          message.error({ content: "Tất cả các đáp án của câu hỏi Nghe & Chọn ảnh phải được gắn hình ảnh!", key: "question-form-validation-error" });
          return;
        }
      }
    }

    if (qType === "matching") {
      const pairs = values.pairs ?? [];
      if (pairs.length < 2) {
        message.error({ content: "Câu hỏi ghép đôi phải có ít nhất 2 cặp ghép!", key: "question-form-validation-error" });
        return;
      }
      const invalidPair = pairs.some(
        (p: any) => (!p.leftText?.trim() && !p.leftMediaId && !p.leftMediaVal) || !p.rightText?.trim()
      );
      if (invalidPair) {
        message.error({
          content: "Mỗi cặp ghép đôi phải có nội dung hoặc hình ảnh/âm thanh ở vế trái và đáp án ở vế phải!",
          key: "question-form-validation-error",
        });
        return;
      }
    }

    if (qType === "audio_fill_blanks") {
      if (!values.passageText?.trim()) {
        message.error({
          content: "Vui lòng nhập đoạn văn có chứa ô trống!",
          key: "question-form-validation-error",
        });
        return;
      }
      const tokenMatches = values.passageText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
      if (tokenMatches.length === 0) {
        message.error({
          content: "Đoạn văn phải chứa ít nhất một ô trống có định dạng {{blank1}}!",
          key: "question-form-validation-error",
        });
        return;
      }
      const blanks = values.blanks ?? [];
      if (blanks.length === 0) {
        message.error({
          content: "Vui lòng cấu hình đáp án cho các ô trống!",
          key: "question-form-validation-error",
        });
        return;
      }
      for (const b of blanks) {
        const answers = Array.isArray(b.acceptedAnswers)
          ? b.acceptedAnswers
          : typeof b.acceptedAnswers === "string"
            ? b.acceptedAnswers.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [];
        if (answers.length === 0) {
          message.error({
            content: `Ô trống {{${b.id || "..."}}} chưa có đáp án chấp nhận!`,
            key: "question-form-validation-error",
          });
          return;
        }
      }
    }

    try {
      const payload: any = {
        type: qType,
        prompt: formatTextForBackend(values.prompt),
        instruction: values.instruction !== undefined ? formatTextForBackend(values.instruction) : (editingItem?.instruction ? formatTextForBackend(editingItem.instruction) : undefined),
        explanation: values.explanation !== undefined ? formatTextForBackend(values.explanation) : (editingItem?.explanation ? formatTextForBackend(editingItem.explanation) : undefined),
        difficultyLevelId: values.difficultyLevelId,
        skillId: values.skillId,
        topicId: values.topicId,
        tagIds: values.tagIds ?? [],
        status: editingItem?.status ?? "published",
        mediaIds: (values.mediaIds ?? [])
          .filter((m: any) => m?.mediaId)
          .map((m: any, idx: number) => ({
            mediaId: m.mediaId,
            role: m.role || (qType === "image_choice" ? "prompt_image" : (qType === "audio_choice" || qType === "audio_image_choice" || qType === "audio_fill_blanks") ? "prompt_audio" : "prompt_image"),
            orderIndex: m.orderIndex !== undefined ? m.orderIndex : idx,
          })),
      };

      // Đảm bảo loại câu hỏi hình ảnh / âm thanh luôn chuẩn hóa vai trò media
      if (qType === "image_choice" && payload.mediaIds.length > 0) {
        if (!payload.mediaIds.some((m: any) => m.role === "prompt_image")) {
          payload.mediaIds[0].role = "prompt_image";
        }
      }
      if ((qType === "audio_choice" || qType === "audio_image_choice" || qType === "audio_fill_blanks") && payload.mediaIds.length > 0) {
        if (!payload.mediaIds.some((m: any) => m.role === "prompt_audio")) {
          payload.mediaIds[0].role = "prompt_audio";
        }
      }

      if (qType === "audio_fill_blanks") {
        const hasAudio = payload.mediaIds.some((m: any) => m.role === "prompt_audio");
        if (!hasAudio) {
          message.error({
            content: "Câu hỏi Nghe và điền từ cần một tệp âm thanh đề bài!",
            key: "question-form-validation-error",
          });
          return;
        }
      }

      if (CHOICE_TYPES.includes(qType)) {
        payload.options = (values.options ?? []).map((o: any, i: number) => ({
          label: String.fromCharCode(65 + i),
          content: formatTextForBackend(o.content ?? ""),
          isCorrect: !!o.isCorrect,
          orderIndex: i,
          explanation: o.explanation ? formatTextForBackend(o.explanation) : undefined,
          ...(o.mediaId ? { mediaId: o.mediaId } : {}),
        }));
        payload.detail = {};
        if (qType === "reading_comprehension") payload.detail = { passageId: values.passageId };
      } else if (qType === "word_ordering") {
        payload.options = [];
        payload.detail = { correctTokens: (values.correctTokens ?? "").split(" ").filter(Boolean), caseSensitive: !!values.caseSensitive, allowPunctuationVariants: !!values.allowPunctuationVariants };
      } else if (qType === "sentence_rewrite") {
        payload.options = [];
        payload.detail = { sourceSentence: formatTextForBackend(values.prompt), acceptedAnswers: (values.acceptedAnswers ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean), gradingMode: values.gradingMode ?? "normalized" };
      } else if (qType === "hint_rewrite") {
        payload.options = [];
        payload.detail = { sourceSentence: formatTextForBackend(values.prompt), hintWord: values.hintWord ? String(values.hintWord).trim() : undefined, acceptedAnswers: (values.acceptedAnswers ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean), mustUseHint: !!values.mustUseHint, gradingMode: values.gradingMode ?? "normalized" };
      } else if (qType === "error_correction") {
        payload.options = [];
        payload.detail = { incorrectSentence: formatTextForBackend(values.prompt), correctSentence: formatTextForBackend(values.correctSentence ?? ""), errorSpans: [] };
      } else if (qType === "matching") {
        payload.options = [];
        payload.detail = {
          shuffleLeft: values.shuffleLeft !== false,
          shuffleRight: values.shuffleRight !== false,
          pairs: (values.pairs ?? []).map((p: any, i: number) => ({
            leftText: formatTextForBackend(p.leftText ?? ""),
            rightText: formatTextForBackend(p.rightText ?? ""),
            leftMediaId: p.leftMediaId || p.leftMediaVal?.mediaId || undefined,
            rightMediaId: p.rightMediaId || undefined,
            orderIndex: i,
          })),
        };
      } else if (qType === "audio_fill_blanks") {
        payload.options = [];
        const blanks = (values.blanks ?? []).map((b: any) => ({
          id: String(b.id || "").trim(),
          acceptedAnswers: Array.isArray(b.acceptedAnswers)
            ? b.acceptedAnswers.map((s: string) => s.trim()).filter(Boolean)
            : String(b.acceptedAnswers ?? "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
        }));
        payload.detail = {
          passageText: formatTextForBackend(values.passageText),
          blanks,
          gradingMode: values.gradingMode ?? "normalized",
        };
      }

      if (editingItem) {
        const { type, status, ...updatePayload } = payload;
        await learningCmsService.questions.update(editingItem.id, {
          ...updatePayload,
          expectedUpdatedAt: editingItem.updatedAt,
        });
        invalidateQuestionDetailCache(editingItem.id);
        setQuestionDetails((prev) => {
          const next = { ...prev };
          delete next[editingItem.id];
          return next;
        });
        message.success("Cập nhật câu hỏi thành công");
      } else {
        await learningCmsService.questions.create({ ...payload, specializationId: selectedSpecializationId });
        message.success(isDuplicatingQuestion ? "Nhân bản câu hỏi thành công" : "Tạo câu hỏi thành công");
      }
      loadAllData();
      setIsDuplicatingQuestion(false);
      setQuestionModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
    }
  };

  const handleViewQuestionVersions = async (record: any) => {
    setViewingQuestion(record);
    setQuestionVersionsModalOpen(true);
  };

  // ============================================================
  // EXAMS CRUD
  // ============================================================

  const handleExamCreate = () => {
    setEditingItem(null);
    setEditingExamInitialCurriculumId(undefined);
    examForm.resetFields();
    setExamModalOpen(true);
  };

  const handleExamEdit = async (record: any) => {
    setEditingItem(record);

    const matches = await learningCmsService.curriculums.list({ examId: record.id, limit: 1 });
    const currId = matches[0]?.id;
    setEditingExamInitialCurriculumId(currId);
    if (matches[0]) setCurriculums(previous => [...previous.filter(row => row.id !== currId), matches[0]]);

    examForm.setFieldsValue({
      code: record.code,
      title: record.title,
      examType: record.examType ?? "practice",
      timeLimitMinutes: record.timeLimitSeconds ? Math.round(record.timeLimitSeconds / 60) : undefined,
      curriculumId: currId,
      description: record.description,
    });
    setExamModalOpen(true);


  };

  const handleExamDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa đề thi",
      content: `Xóa đề thi "${record.title}"?`,
      okText: "Xóa", cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.exams.remove(record.id);
          message.success("Xóa đề thi thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  const handleExamSubmit = async (values: any) => {
    if (examSubmitting) return;
    try {
      setExamSubmitting(true);
      const isExam = values.examType === "exam";
      const timeLimitSeconds = isExam && values.timeLimitMinutes ? values.timeLimitMinutes * 60 : undefined;
      const { timeLimitMinutes, curriculumId, ...rest } = values;

      if (editingItem) {
        await learningCmsService.exams.update(editingItem.id, {
          title: values.title,
          examType: values.examType,
          timeLimitSeconds,
          description: values.description,
        });

        const newCurriculumId = curriculumId || undefined;
        if (newCurriculumId !== editingExamInitialCurriculumId) {
          // 1. Nếu trước đó đã thuộc giáo trình cũ -> gỡ khỏi giáo trình cũ
          if (editingExamInitialCurriculumId) {
            try {
              await learningCmsService.curriculums.removeExam(editingExamInitialCurriculumId, editingItem.id);
            } catch (removeErr: any) {
              console.error("Lỗi khi gỡ đề thi khỏi giáo trình cũ:", removeErr);
            }
          }

          // 2. Nếu người dùng chọn giáo trình mới -> gắn vào giáo trình mới
          if (newCurriculumId) {
            try {
              const currDetail = await learningCmsService.curriculums.get(newCurriculumId);
              const currExams = (currDetail as any)?.exams ?? [];
              const maxOrderIndex = currExams.reduce(
                (max: number, item: any) => Math.max(max, Number(item.orderIndex) || 0),
                -1
              );
              const nextOrderIndex = maxOrderIndex + 1;

              await learningCmsService.curriculums.attachExam(newCurriculumId, {
                examId: editingItem.id,
                orderIndex: nextOrderIndex,
                isRequired: true,
              });
              message.success("Cập nhật đề thi và gắn vào giáo trình thành công!");
            } catch (attachErr: any) {
              console.error("Lỗi khi gắn đề thi vào giáo trình mới:", attachErr);
              Modal.warning({
                title: "Đã cập nhật đề thi",
                content: `Đề thi "${values.title || editingItem.title}" đã được lưu, nhưng chưa thể gắn vào giáo trình mới (Lý do: ${extractErrorMsg(attachErr)}). Bạn có thể vào tab Giáo trình để cấu hình lại.`,
              });
            }
          } else {
            message.success("Cập nhật đề thi và đã gỡ khỏi giáo trình cũ");
          }
        } else {
          message.success("Cập nhật đề thi thành công");
        }
      } else {
        const newExam = await learningCmsService.exams.create({
          ...rest,
          examType: values.examType ?? "practice",
          timeLimitSeconds,
          specializationId: selectedSpecializationId,
          status: "draft",
        });

        if (curriculumId) {
          try {
            // Lấy thông tin mới nhất của giáo trình để tính orderIndex tiếp theo không bị trùng lặp
            const currDetail = await learningCmsService.curriculums.get(curriculumId);
            const currExams = (currDetail as any)?.exams ?? [];
            const maxOrderIndex = currExams.reduce(
              (max: number, item: any) => Math.max(max, Number(item.orderIndex) || 0),
              -1
            );
            const nextOrderIndex = maxOrderIndex + 1;

            await learningCmsService.curriculums.attachExam(curriculumId, {
              examId: newExam.id,
              orderIndex: nextOrderIndex,
              isRequired: true,
            });

            message.success("Tạo đề thi và gắn vào giáo trình thành công!");
          } catch (attachErr: any) {
            console.error("Lỗi khi tự động gắn đề thi vào giáo trình:", attachErr);
            Modal.warning({
              title: "Đã tạo đề thi thành công",
              content: `Đề thi "${newExam.title}" đã được lưu vào hệ thống, nhưng chưa thể tự động gắn vào giáo trình (Lý do: ${extractErrorMsg(attachErr)}). Bạn có thể vào tab Giáo trình để cấu hình gắn đề này.`,
            });
          }
        } else {
          message.success("Tạo đề thi thành công");
        }
      }
      loadAllData();
      setExamModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
    } finally {
      setExamSubmitting(false);
    }
  };

  const handleToggleExamStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.exams.updateStatus(record.id, { status: nextStatus, expectedUpdatedAt: record.updatedAt });
      message.success(`Chuyển trạng thái sang ${nextStatus === "published" ? "Đang phát hành" : "Nháp"}`);
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Đổi trạng thái thất bại"));
    }
  };

  const handleRepublishExam = async (record: any) => {
    try {
      await learningCmsService.exams.updateStatus(record.id, { status: "published", expectedUpdatedAt: record.updatedAt });
      message.success("Xuất bản phiên bản mới thành công!");
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Xuất bản thất bại"));
    }
  };

  const handleViewExamVersions = async (record: any) => {
    setViewingExam(record);
    setExamVersionsModalOpen(true);
  };

  // ── Exam question management ───────────────────────────────

  const handleOpenQuestions = async (exam: any) => {
    resetExamQFilters();
    try {
      const full = await learningCmsService.exams.get(exam.id);
      setSelectedExam(full);
    } catch {
      setSelectedExam(exam);
    }
    setManageQuestionsOpen(true);


  };

  const handleAddQuestionToExam = async (questionId: string) => {
    if (!selectedExam) return;
    try {
      const existing = selectedExam.questions ?? (selectedExam as any).examQuestions ?? [];
      const existingIndices = new Set<number>(
        existing
          .map((q: any) => Number(q.orderIndex))
          .filter((n: number) => !isNaN(n))
      );
      let orderIndex = existing.length;
      if (existingIndices.size > 0) {
        const maxIdx = Math.max(...Array.from(existingIndices));
        orderIndex = Math.max(maxIdx + 1, existing.length);
      }
      while (existingIndices.has(orderIndex)) {
        orderIndex++;
      }

      await learningCmsService.exams.attachQuestion(selectedExam.id, { questionId, orderIndex });
      message.success("Thêm câu hỏi thành công");
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Thêm câu hỏi thất bại"));
      throw err;
    }
  };

  const handleBulkAttachQuestionsToExam = async (items: { questionId: string; orderIndex?: number }[]) => {
    if (!selectedExam) return;
    try {
      await learningCmsService.exams.bulkAttachQuestions(selectedExam.id, { items });
      message.success(`Đã thêm ${items.length} câu hỏi vào đề thi`);
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Gắn câu hỏi hàng loạt thất bại"));
      throw err;
    }
  };

  const handleRemoveQuestionFromExam = async (questionId: string) => {
    if (!selectedExam) return;
    try {
      await learningCmsService.exams.removeQuestion(selectedExam.id, questionId);
      message.success("Gỡ câu hỏi thành công");
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Gỡ câu hỏi thất bại"));
    }
  };

  const handleReorderExamQuestions = async (index: number, direction: "up" | "down") => {
    if (!selectedExam) return;
    const items = [...(selectedExam.questions ?? [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    try {
      await learningCmsService.exams.reorderQuestions(selectedExam.id, {
        items: items.map((q: any, i: number) => ({ questionId: q.questionId, orderIndex: i })),
      });
      message.success("Sắp xếp lại thành công");
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Sắp xếp lại thất bại"));
    }
  };

  // ── Exam republish from ManageQuestionsModal ───────────────

  const handleRepublishFromManageModal = async () => {
    if (!selectedExam) return;
    try {
      await learningCmsService.exams.updateStatus(selectedExam.id, { status: "published", expectedUpdatedAt: selectedExam.updatedAt });
      message.success("Xuất bản phiên bản mới thành công!");
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Xuất bản thất bại"));
    }
  };

  // ============================================================
  // CURRICULUMS CRUD
  // ============================================================

  const handleCurriculumCreate = () => {
    setEditingItem(null);
    curriculumForm.resetFields();
    setCurriculumModalOpen(true);
  };

  const handleCurriculumEdit = (record: any) => {
    setEditingItem(record);
    curriculumForm.setFieldsValue({
      code: record.code,
      title: record.title,
      levelId: record.levelId,
      description: record.description,
      image: record.image || null,
    });
    setCurriculumModalOpen(true);
  };

  const handleCurriculumDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa giáo trình",
      content: `Xóa giáo trình "${record.title}"?`,
      okText: "Xóa", cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.curriculums.remove(record.id);
          message.success("Xóa giáo trình thành công");
          loadAllData();
        } catch (error: any) {
          message.error(extractErrorMsg(error, "Xóa thất bại"));
        }
      },
    });
  };

  const handleCurriculumSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await learningCmsService.curriculums.update(editingItem.id, {
          title: values.title,
          levelId: values.levelId,
          description: values.description,
          image: values.image || null,
        });
        message.success("Cập nhật giáo trình thành công");
      } else {
        await learningCmsService.curriculums.create({
          ...values,
          image: values.image || undefined,
          specializationId: selectedSpecializationId,
          status: "draft",
        });
        message.success("Tạo giáo trình thành công");
      }
      loadAllData();
      setCurriculumModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
    }
  };

  const handleToggleCurriculumStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.curriculums.updateStatus(record.id, { status: nextStatus, expectedUpdatedAt: record.updatedAt });
      message.success(`Chuyển trạng thái sang ${nextStatus === "published" ? "Đang phát hành" : "Nháp"}`);
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Đổi trạng thái thất bại"));
    }
  };

  // ── Curriculum exam management ─────────────────────────────

  const handleOpenExams = async (curr: any) => {
    try {
      const full = await learningCmsService.curriculums.get(curr.id);
      setSelectedCurriculum(full);
    } catch {
      setSelectedCurriculum(curr);
    }
    setManageExamsOpen(true);
  };

  const handleAddExamToCurriculum = async (examId: string) => {
    if (!selectedCurriculum) return;
    try {
      const existing = selectedCurriculum.exams ?? [];
      const existingIndices = new Set<number>(
        existing
          .map((e: any) => Number(e.orderIndex))
          .filter((n: number) => !isNaN(n))
      );
      let orderIndex = existing.length;
      if (existingIndices.size > 0) {
        const maxIdx = Math.max(...Array.from(existingIndices));
        orderIndex = Math.max(maxIdx + 1, existing.length);
      }
      while (existingIndices.has(orderIndex)) {
        orderIndex++;
      }

      await learningCmsService.curriculums.attachExam(selectedCurriculum.id, { examId, isRequired: true, orderIndex });
      message.success("Thêm đề thi thành công");
      const updated = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updated);
      setCurriculums((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Thêm đề thi thất bại. Đề thi phải ở trạng thái Đã phát hành."));
      throw err;
    }
  };

  const handleRemoveExamFromCurriculum = async (examId: string) => {
    if (!selectedCurriculum) return;
    try {
      await learningCmsService.curriculums.removeExam(selectedCurriculum.id, examId);
      message.success("Gỡ đề thi thành công");
      const updated = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updated);
      setCurriculums((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Gỡ đề thi thất bại"));
    }
  };

  const handleReorderCurriculumExams = async (index: number, direction: "up" | "down") => {
    if (!selectedCurriculum) return;
    const items = [...(selectedCurriculum.exams ?? [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    try {
      await learningCmsService.curriculums.reorderExams(selectedCurriculum.id, {
        items: items.map((e: any, i: number) => ({ examId: e.examId, orderIndex: i })),
      });
      message.success("Sắp xếp lại thành công");
      const updated = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updated);
      loadAllData();
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Sắp xếp lại thất bại"));
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  const tabItems = [
    {
      key: "taxonomy",
      label: <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold"><OrderedListOutlined /> Taxonomy</span>,
      children: (
        <TaxonomyTab
          taxTab={taxTab}
          onTaxTabChange={setTaxTab}
          taxSearch={String(appliedCmsFilters.search || "")}
          onTaxSearchChange={value => applyCmsFilters({ search: value })}
          searchPlaceholder={getSearchPlaceholder()}
          columns={taxColumns}
          dataSource={getTaxData()}
          loading={taxLoading || (activeTab === "taxonomy" && resourcePage.loading)}
          pagination={{
            current: taxPage,
            pageSize: taxPageSize,
            total: taxTotal,
            onChange: handleTaxPageChange,
          }}
          onCreateClick={handleTaxCreate}
        />
      ),
    },
    {
      key: "media",
      label: <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold"><PictureOutlined /> Media Assets</span>,
      children: (
        <MediaTab
          media={media}
          loading={mediaLoading}
          typeFilter={mediaTypeFilter}
          onTypeFilterChange={handleMediaTypeFilterChange}
          pagination={{
            current: mediaPage,
            pageSize: mediaPageSize,
            total: mediaTotal,
            onChange: handleMediaPageChange,
          }}
          onUploadClick={() => { setUploadFile(null); setMediaAlt(""); setMediaModalOpen(true); }}
          onDeleteClick={handleMediaDelete}
          onPreviewClick={handlePreviewAsset}
        />
      ),
    },
    {
      key: "passages",
      label: <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold"><ReadOutlined /> Bài đọc</span>,
      children: (
        <PassagesTab
          passages={passages}
          loading={passagesLoading}
          pagination={{
            current: passagesPage,
            pageSize: passagesPageSize,
            total: passagesTotal,
            onChange: handlePassagesPageChange,
          }}
          onCreateClick={handlePassageCreate}
          onEditClick={handlePassageEdit}
          onDeleteClick={handlePassageDelete}
        />
      ),
    },
    {
      key: "questions",
      label: (
        <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
          <QuestionCircleOutlined /> Câu hỏi
          <Badge count={tabCount("questions")} showZero overflowCount={9999} title={cmsSummary.error ? "Không tải được số lượng" : undefined} color="indigo" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <QuestionsTab
          questions={questions}
          skills={skills}
          levels={levels}
          topics={topics}
          tags={tags}
          questionDetails={questionDetails}
          loading={questionsLoading}
          pagination={{
            current: questionsPage,
            pageSize: questionsPageSize,
            total: questionsTotal,
            onChange: handleQuestionsPageChange,
          }}
          onCreateClick={handleQuestionCreate}
          onEditClick={handleQuestionEdit}
          onDuplicateClick={handleQuestionDuplicate}
          onDeleteClick={handleQuestionDelete}
          onViewVersions={handleViewQuestionVersions}
        />
      ),
    },
    {
      key: "exams",
      label: (
        <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
          <BookOutlined /> Đề thi
          <Badge count={tabCount("exams")} showZero overflowCount={9999} title={cmsSummary.error ? "Không tải được số lượng" : undefined} color="blue" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <ExamsTab
          exams={exams}
          loading={examsLoading}
          pagination={{
            current: examsPage,
            pageSize: examsPageSize,
            total: examsTotal,
            onChange: handleExamsPageChange,
          }}
          onCreateClick={handleExamCreate}
          onEditClick={handleExamEdit}
          onDeleteClick={handleExamDelete}
          onToggleStatus={handleToggleExamStatus}
          onRepublish={handleRepublishExam}
          onConfigQuestions={handleOpenQuestions}
          onViewVersions={handleViewExamVersions}
        />
      ),
    },
    {
      key: "curriculums",
      label: (
        <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
          <FileTextOutlined /> Giáo trình
          <Badge count={tabCount("curriculums")} showZero overflowCount={9999} title={cmsSummary.error ? "Không tải được số lượng" : undefined} color="purple" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <CurriculumsTab
          curriculums={curriculums}
          exams={exams}
          loading={curriculumsLoading}
          pagination={{
            current: curriculumsPage,
            pageSize: curriculumsPageSize,
            total: curriculumsTotal,
            onChange: handleCurriculumsPageChange,
          }}
          onCreateClick={handleCurriculumCreate}
          onEditClick={handleCurriculumEdit}
          onDeleteClick={handleCurriculumDelete}
          onToggleStatus={handleToggleCurriculumStatus}
          onConfigExams={handleOpenExams}
        />
      ),
    },
  ];

  return (
    <CmsHeaderFilterContext.Provider value={{ filters: appliedCmsFilters, apply: applyCmsFilters, subjectId: selectedSpecializationId }}><LearningLookupScope.Provider value={selectedSpecializationId}><ConfigProvider theme={ANT_THEME}>
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <div>
          <div className="max-w-[1500px] mx-auto space-y-6">

            {/* ── Page header ──────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
              <div className="flex-1 min-w-0">
                <Title level={2} className="!mb-1 !text-slate-900 font-extrabold tracking-tight">
                  Learning CMS Dashboard
                </Title>
                <Text className="text-slate-500 text-sm leading-relaxed block max-w-3xl">
                  Quản lý ngân hàng câu hỏi, bài đọc, đề kiểm tra và giáo trình giảng dạy theo từng môn học
                </Text>
              </div>


            </div>

            {/* ── Tab section ───────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              {/* Subject selector + quick stats */}
              <div className="flex flex-wrap items-center gap-4">
                {specializations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 max-w-full bg-slate-50/80 p-2 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center gap-2.5 px-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                        <BookOpenIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                        Môn học:
                      </span>
                    </div>
                    <ServerSelect endpoint="/specializations" query={{ isActive: true }} onRecords={rows => setSpecializations(previous => Array.from(new Map([...previous, ...rows].map(row => [row.id, row])).values()))}
                      value={selectedSpecializationId}
                      onChange={handleSubjectChange}
                      size="large"
                      showSearch
                      allowClear={false}
                      filterOption={(input, option) =>
                        (option?.searchValue ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={subjectOptions}
                      optionRender={(option) => (
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="font-bold text-slate-800 text-sm">{option.data.label}</span>
                          {option.data.code && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase">
                              {option.data.code}
                            </span>
                          )}
                        </div>
                      )}
                      placeholder="Tìm & chọn môn học..."
                      className="w-full sm:w-[280px] min-w-0 font-semibold text-sm [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-slate-200 [&_.ant-select-selector]:!bg-white [&_.ant-select-selector]:!shadow-xs hover:[&_.ant-select-selector]:!border-indigo-400 [&_.ant-select-selector]:!h-10 [&_.ant-select-selection-item]:!flex [&_.ant-select-selection-item]:!items-center"
                      popupMatchSelectWidth={false}
                    />
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <Badge count={tabCount("draftExams")} showZero overflowCount={9999} color="blue">
                    <div className="bg-blue-50/80 border border-blue-100 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold">
                      Đề thi nháp
                    </div>
                  </Badge>
                </div>
              </div>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                size="large"
                items={tabItems}
              />
            </div>

            {/* ── Modals ────────────────────────────────────── */}

            <TaxonomyModal
              open={taxModalOpen}
              onCancel={() => setTaxModalOpen(false)}
              form={taxForm}
              onFinish={handleTaxSubmit}
              taxTab={taxTab}
              isEditing={!!editingItem}
              topics={topics}
              editingItem={editingItem}
            />

            <MediaUploadModal
              open={mediaModalOpen}
              onCancel={() => setMediaModalOpen(false)}
              onUpload={handleMediaUpload}
              confirmLoading={uploadLoading}
              uploadFile={uploadFile}
              onFileChange={setUploadFile}
              mediaAlt={mediaAlt}
              onAltChange={setMediaAlt}
            />

            <PassageFormModal
              open={passageModalOpen}
              onCancel={() => setPassageModalOpen(false)}
              form={passageForm}
              onFinish={handlePassageSubmit}
              isEditing={!!editingItem}
              levels={[...levels, editingItem?.level].filter(Boolean)}
            />

            <QuestionFormModal
              open={questionModalOpen}
              onCancel={() => {
                setQuestionModalOpen(false);
                setIsDuplicatingQuestion(false);
              }}
              form={questionForm}
              onFinish={handleQuestionSubmit}
              isEditing={!!editingItem}
              isDuplicating={isDuplicatingQuestion}
              currentType={currentQuestionType}
              onTypeChange={setCurrentQuestionType}
              levels={[...levels, editingItem?.difficultyLevel, editingItem?.level].filter(Boolean)}
              skills={[...skills, editingItem?.skill].filter(Boolean)}
              topics={[...topics, editingItem?.topic].filter(Boolean)}
              tags={Array.from(new Map([...tags, ...(editingItem?.tags || [])].map(tag => [tag.id, tag])).values())}
              passages={[...passages, editingItem?.readingPassage].filter(Boolean)}
              filteredMedia={getFilteredMedia()}
              allMedia={media}
              availableRoles={getAvailableRoles()}
              onPreviewAsset={handlePreviewAsset}
              onUploadMedia={handleUploadQuestionMedia}
            />

            <ExamFormModal
              open={examModalOpen}
              onCancel={() => setExamModalOpen(false)}
              form={examForm}
              onFinish={handleExamSubmit}
              isEditing={!!editingItem}
              curriculums={curriculums}
              confirmLoading={examSubmitting}
            />

            <CurriculumFormModal
              open={curriculumModalOpen}
              onCancel={() => setCurriculumModalOpen(false)}
              form={curriculumForm}
              onFinish={handleCurriculumSubmit}
              isEditing={!!editingItem}
              levels={[...levels, editingItem?.level].filter(Boolean)}
            />

            <ExamVersionsModal
              open={examVersionsModalOpen}
              viewingExam={viewingExam}
              examVersions={examVersions}
              onCancel={() => { setExamVersionsModalOpen(false); setViewingExam(null); }}
              onRefresh={(updatedExam, versions) => { setViewingExam(updatedExam); setExamVersions(versions); }}
              onLoadAllData={loadAllData}
            />

            <QuestionVersionsModal
              open={questionVersionsModalOpen}
              viewingQuestion={viewingQuestion}
              questionVersions={questionVersions}
              onCancel={() => { setQuestionVersionsModalOpen(false); setViewingQuestion(null); }}
            />

            <ManageQuestionsModal
              open={manageQuestionsOpen}
              selectedExam={selectedExam}
              onCancel={() => { setManageQuestionsOpen(false); setSelectedExam(null); }}
              onDone={() => { setManageQuestionsOpen(false); setSelectedExam(null); }}
              allQuestions={allQuestionsForModal.length > 0 ? allQuestionsForModal : questions}
              questionDetails={questionDetails}
              skills={skills}
              levels={levels}
              topics={topics}
              tags={tags}
              examQSearch={examQSearch}
              onExamQSearch={setExamQSearch}
              examQTypeFilter={examQTypeFilter}
              onExamQTypeFilter={setExamQTypeFilter}
              examQSkillFilter={examQSkillFilter}
              onExamQSkillFilter={setExamQSkillFilter}
              examQLevelFilter={examQLevelFilter}
              onExamQLevelFilter={setExamQLevelFilter}
              examQTopicFilter={examQTopicFilter}
              onExamQTopicFilter={setExamQTopicFilter}
              examQTagFilter={examQTagFilter}
              onExamQTagFilter={setExamQTagFilter}
              onResetFilters={resetExamQFilters}
              onAddQuestion={handleAddQuestionToExam}
              onRemoveQuestion={handleRemoveQuestionFromExam}
              onReorder={handleReorderExamQuestions}
              onRepublish={handleRepublishFromManageModal}
              onBulkAttach={handleBulkAttachQuestionsToExam}
            />

            <ManageExamsModal
              open={manageExamsOpen}
              selectedCurriculum={selectedCurriculum}
              onCancel={() => { setManageExamsOpen(false); setSelectedCurriculum(null); }}
              onDone={() => { setManageExamsOpen(false); setSelectedCurriculum(null); }}
              allExams={exams}
              onAddExam={handleAddExamToCurriculum}
              onRemoveExam={handleRemoveExamFromCurriculum}
              onReorder={handleReorderCurriculumExams}
            />

            <MediaPreviewModal
              open={previewVisible}
              asset={previewAsset}
              onCancel={() => { setPreviewVisible(false); setPreviewAsset(null); }}
            />

            {/* LIGHTBOX PREVIEW ELEMENT */}
            {previewElement}

          </div>
        </div>
      </div>
    </ConfigProvider></LearningLookupScope.Provider></CmsHeaderFilterContext.Provider>
  );
}

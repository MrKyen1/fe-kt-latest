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
  Spin,
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

// ── Constants ────────────────────────────────────────────────
import {
  CHOICE_TYPES,
  LIST_LIMIT,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
} from "./learningCms/constants";

// ── Tab components ───────────────────────────────────────────
import TaxonomyTab from "./learningCms/components/TaxonomyTab";
import MediaTab from "./learningCms/components/MediaTab";
import PassagesTab from "./learningCms/components/PassagesTab";
import QuestionsTab from "./learningCms/components/QuestionsTab";
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
  const { user } = useAuth();

  // ── Global loading ─────────────────────────────────────────
  const [loading, setLoading] = useState(false);

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

  const selectedSpecializationId = useMemo(() => {
    if (urlSubjectId && specializations.some((s) => s.id === urlSubjectId)) {
      return urlSubjectId;
    }
    return specializations[0]?.id || undefined;
  }, [urlSubjectId, specializations]);

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
  const [taxSearch, setTaxSearch] = useState("");
  const [debouncedTaxSearch, setDebouncedTaxSearch] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);
  const [filteredLevels, setFilteredLevels] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<any[]>([]);
  const [filteredTags, setFilteredTags] = useState<any[]>([]);

  // Refs for search synchronisation
  const prevTabRef = useRef(taxTab);
  const isInitialMount = useRef(true);
  const lastFetchedSearchRef = useRef("");

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
  const [examVersionsModalOpen, setExamVersionsModalOpen] = useState(false);
  const [questionVersionsModalOpen, setQuestionVersionsModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [manageQuestionsOpen, setManageQuestionsOpen] = useState(false);
  const [manageExamsOpen, setManageExamsOpen] = useState(false);

  // ── Editing / selected state ───────────────────────────────
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<any>(null);
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("multiple_choice");

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
    if (currentQuestionType === "audio_choice")
      return media.filter((m) => m.type === "audio" || m.mimeType?.startsWith("audio"));
    return media;
  };

  const getAvailableRoles = () => {
    if (currentQuestionType === "image_choice")
      return [{ value: "prompt_image", label: "Hình ảnh đề bài" }];
    if (currentQuestionType === "audio_choice")
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
      render: (val: string) => {
        const parent = topics.find((t) => t.id === val);
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

  const loadTaxonomyData = async (tab: string, searchVal: string) => {
    try {
      setTaxLoading(true);
      lastFetchedSearchRef.current = searchVal;
      const res = await getTaxService(tab).list({
        specializationId: tab !== "tags" ? selectedSpecializationId : undefined,
        limit: LIST_LIMIT,
        search: searchVal || undefined,
        sortBy: "name",
        sortOrder: "ASC",
      });
      const data = res.data ?? [];

      switch (tab) {
        case "levels": setFilteredLevels(data); break;
        case "skills": setFilteredSkills(data); break;
        case "topics": setFilteredTopics(data); break;
        case "tags": setFilteredTags(data); break;
      }
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Tải dữ liệu danh mục thất bại"));
    } finally {
      setTaxLoading(false);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);

      const results = await Promise.allSettled([
        learningCmsService.levels.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT, sortBy: "name", sortOrder: "ASC" }),
        learningCmsService.skills.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT, sortBy: "name", sortOrder: "ASC" }),
        learningCmsService.topics.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT, sortBy: "name", sortOrder: "ASC" }),
        learningCmsService.tags.list({ limit: LIST_LIMIT, sortBy: "name", sortOrder: "ASC" }),
        learningCmsService.mediaAssets.list({ limit: LIST_LIMIT }),
        learningCmsService.readingPassages.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT, sortBy: "title", sortOrder: "ASC" }),
        learningCmsService.questions.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT }),
        learningCmsService.exams.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT }),
        learningCmsService.curriculums.list({ specializationId: selectedSpecializationId, limit: LIST_LIMIT }),
      ]);

      const get = (i: number) =>
        results[i].status === "fulfilled"
          ? (results[i] as PromiseFulfilledResult<any>).value
          : null;

      // Surface any API failures as a warning
      const API_NAMES = ["Levels", "Skills", "Topics", "Tags", "Media Assets", "Reading Passages", "Questions", "Exams", "Curriculums"];
      const failed = results
        .map((r, i) => (r.status === "rejected" ? API_NAMES[i] : null))
        .filter(Boolean);
      if (failed.length) {
        message.warning(`Một số API bị lỗi: ${failed.join(", ")}. Vui lòng kiểm tra backend.`);
      }

      const levelsData = get(0)?.data ?? [];
      const skillsData = get(1)?.data ?? [];
      const topicsData = get(2)?.data ?? [];
      const tagsData = get(3)?.data ?? [];

      setLevels(levelsData);
      setSkills(skillsData);
      setTopics(topicsData);
      setTags(tagsData);

      if (!taxSearch) {
        setFilteredLevels(levelsData);
        setFilteredSkills(skillsData);
        setFilteredTopics(topicsData);
        setFilteredTags(tagsData);
        lastFetchedSearchRef.current = "";
      } else {
        if (taxTab !== "levels") setFilteredLevels(levelsData);
        if (taxTab !== "skills") setFilteredSkills(skillsData);
        if (taxTab !== "topics") setFilteredTopics(topicsData);
        if (taxTab !== "tags") setFilteredTags(tagsData);
        loadTaxonomyData(taxTab, taxSearch);
      }

      setMedia(get(4)?.data ?? []);
      setPassages(get(5)?.data ?? []);
      setQuestions(get(6)?.data ?? []);

      // Fetch full exam details to get question counts
      const examList: any[] = get(7)?.data ?? [];
      if (examList.length > 0) {
        const detailResults = await Promise.allSettled(
          examList.map((e) => learningCmsService.exams.get(e.id)),
        );
        const fullExams = detailResults.map((r, i) =>
          r.status === "fulfilled" ? r.value : examList[i],
        );
        setExams(fullExams);
      } else {
        setExams([]);
      }

      setCurriculums(get(8)?.data ?? []);
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Tải dữ liệu CMS thất bại"));
    } finally {
      setLoading(false);
    }
  };

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        let specs: any[] = [];
        if (user?.role === "teacher" && user?.teacherProfile?.specializations?.length) {
          specs = user.teacherProfile.specializations;
        } else {
          try {
            specs = await academicService.specializations.list({ isActive: true });
          } catch (err: any) {
            if (user?.teacherProfile?.specializations?.length) {
              specs = user.teacherProfile.specializations;
            } else {
              throw err;
            }
          }
        }
        setSpecializations(specs ?? []);
        if (specs?.length > 0 && !urlSubjectId) {
          navigate(`/${rolePrefix}/cms/subjects/${specs[0].id}/${activeTab}${activeTab === "taxonomy" ? `/${taxTab}` : ""}`, { replace: true });
        }
      } catch (error: any) {
        message.error(extractErrorMsg(error, "Tải danh sách môn học thất bại"));
      }
    };
    fetchSpecs();
  }, [user]);

  useEffect(() => {
    if (selectedSpecializationId) loadAllData();
  }, [selectedSpecializationId]);

  // Debounce taxonomy search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTaxSearch(taxSearch), 400);
    return () => clearTimeout(timer);
  }, [taxSearch]);

  // Sync tab changes + execute search
  useEffect(() => {
    if (prevTabRef.current !== taxTab) {
      prevTabRef.current = taxTab;
      setTaxSearch("");
      loadTaxonomyData(taxTab, "");
      return;
    }
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (debouncedTaxSearch === lastFetchedSearchRef.current) return;
    loadTaxonomyData(taxTab, debouncedTaxSearch);
  }, [taxTab, debouncedTaxSearch]);

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
      }

      const mediaIds = (fullRecord.media ?? []).map((m: any) => ({
        mediaId: m.mediaId ?? m.media?.id,
        role: m.role,
        orderIndex: m.orderIndex,
      }));

      setQuestionModalOpen(true);
      questionForm.setFieldsValue({
        type: fullRecord.type,
        prompt: fullRecord.type === "error_correction" && fullRecord.detail?.incorrectSentence
          ? fullRecord.detail.incorrectSentence
          : fullRecord.prompt,
        instruction: fullRecord.instruction,
        explanation: fullRecord.explanation,
        difficultyLevelId: fullRecord.difficultyLevelId,
        skillId: fullRecord.skillId,
        topicId: fullRecord.topicId,
        tagIds: (fullRecord.tags ?? []).map((t: any) => t.id),
        options: fullRecord.options ?? [],
        mediaIds,
        ...detailFields,
      });
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Không thể tải chi tiết câu hỏi"));
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
    }

    try {
      const payload: any = {
        type: qType,
        prompt: values.prompt,
        instruction: values.instruction ?? editingItem?.instruction,
        explanation: values.explanation ?? editingItem?.explanation,
        difficultyLevelId: values.difficultyLevelId,
        skillId: values.skillId,
        topicId: values.topicId,
        tagIds: values.tagIds ?? [],
        status: editingItem?.status ?? "draft",
        mediaIds: (values.mediaIds ?? [])
          .filter((m: any) => m?.mediaId)
          .map((m: any, idx: number) => ({
            mediaId: m.mediaId,
            role: m.role || (qType === "image_choice" ? "prompt_image" : qType === "audio_choice" ? "prompt_audio" : "prompt_image"),
            orderIndex: m.orderIndex !== undefined ? m.orderIndex : idx,
          })),
      };

      // Đảm bảo loại câu hỏi hình ảnh / âm thanh luôn chuẩn hóa vai trò media
      if (qType === "image_choice" && payload.mediaIds.length > 0) {
        if (!payload.mediaIds.some((m: any) => m.role === "prompt_image")) {
          payload.mediaIds[0].role = "prompt_image";
        }
      }
      if (qType === "audio_choice" && payload.mediaIds.length > 0) {
        if (!payload.mediaIds.some((m: any) => m.role === "prompt_audio")) {
          payload.mediaIds[0].role = "prompt_audio";
        }
      }

      if (CHOICE_TYPES.includes(qType)) {
        payload.options = (values.options ?? []).map((o: any, i: number) => ({
          label: String.fromCharCode(65 + i),
          content: o.content,
          isCorrect: !!o.isCorrect,
          orderIndex: i,
          explanation: o.explanation,
        }));
        payload.detail = {};
        if (qType === "reading_comprehension") payload.detail = { passageId: values.passageId };
      } else if (qType === "word_ordering") {
        payload.options = [];
        payload.detail = { correctTokens: (values.correctTokens ?? "").split(" ").filter(Boolean), caseSensitive: !!values.caseSensitive, allowPunctuationVariants: !!values.allowPunctuationVariants };
      } else if (qType === "sentence_rewrite") {
        payload.options = [];
        payload.detail = { sourceSentence: values.sourceSentence, acceptedAnswers: (values.acceptedAnswers ?? "").split("\n").filter(Boolean), gradingMode: values.gradingMode ?? "normalized" };
      } else if (qType === "hint_rewrite") {
        payload.options = [];
        payload.detail = { sourceSentence: values.sourceSentence, hintWord: values.hintWord, acceptedAnswers: (values.acceptedAnswers ?? "").split("\n").filter(Boolean), mustUseHint: !!values.mustUseHint, gradingMode: values.gradingMode ?? "normalized" };
      } else if (qType === "error_correction") {
        payload.options = [];
        payload.detail = { incorrectSentence: values.prompt, correctSentence: values.correctSentence, errorSpans: [] };
      } else if (qType === "matching") {
        payload.options = [];
        payload.detail = { shuffleLeft: !!values.shuffleLeft, shuffleRight: !!values.shuffleRight, pairs: (values.pairs ?? []).map((p: any, i: number) => ({ leftText: p.leftText, rightText: p.rightText, orderIndex: i })) };
      }

      if (editingItem) {
        const { type, status, ...updatePayload } = payload;
        await learningCmsService.questions.update(editingItem.id, {
          ...updatePayload,
          expectedUpdatedAt: editingItem.updatedAt,
        });
        message.success("Cập nhật câu hỏi thành công");
      } else {
        await learningCmsService.questions.create({ ...payload, specializationId: selectedSpecializationId });
        message.success("Tạo câu hỏi thành công");
      }
      loadAllData();
      setQuestionModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
    }
  };

  const handleToggleQuestionStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.questions.updateStatus(record.id, { status: nextStatus, expectedUpdatedAt: record.updatedAt });
      message.success(`Chuyển trạng thái câu hỏi sang ${nextStatus === "published" ? "Đã duyệt" : "Bản nháp"}`);
      loadAllData();
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Đổi trạng thái thất bại"));
    }
  };

  const handleViewQuestionVersions = async (record: any) => {
    try {
      setLoading(true);
      const data = await learningCmsService.questions.listVersions(record.id);
      setQuestionVersions(data ?? []);
      setViewingQuestion(record);
      setQuestionVersionsModalOpen(true);
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Không thể tải lịch sử phiên bản của câu hỏi"));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // EXAMS CRUD
  // ============================================================

  const handleExamCreate = () => {
    setEditingItem(null);
    examForm.resetFields();
    setExamModalOpen(true);
  };

  const handleExamEdit = (record: any) => {
    setEditingItem(record);
    examForm.setFieldsValue({
      code: record.code,
      title: record.title,
      examType: record.examType ?? "practice",
      timeLimitMinutes: record.timeLimitSeconds ? Math.round(record.timeLimitSeconds / 60) : undefined,
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
    try {
      const timeLimitSeconds = values.timeLimitMinutes ? values.timeLimitMinutes * 60 : undefined;
      if (editingItem) {
        await learningCmsService.exams.update(editingItem.id, {
          title: values.title,
          examType: values.examType,
          timeLimitSeconds,
          description: values.description,
        });
        message.success("Cập nhật đề thi thành công");
      } else {
        const { timeLimitMinutes, ...rest } = values;
        await learningCmsService.exams.create({
          ...rest,
          examType: values.examType ?? "practice",
          timeLimitSeconds,
          specializationId: selectedSpecializationId,
          status: "draft",
        });
        message.success("Tạo đề thi thành công");
      }
      loadAllData();
      setExamModalOpen(false);
    } catch (error: any) {
      message.error(extractErrorMsg(error));
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
    try {
      setLoading(true);
      const data = await learningCmsService.exams.listVersions(record.id);
      setExamVersions(data ?? []);
      setViewingExam(record);
      setExamVersionsModalOpen(true);
    } catch (error: any) {
      message.error(extractErrorMsg(error, "Không thể tải lịch sử phiên bản của đề thi"));
    } finally {
      setLoading(false);
    }
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

    // Prefetch question details for hover popover
    const publishedQs = questions.filter((q) => q.status === "published");
    const idsToFetch = publishedQs.map((q) => q.id).filter((id) => !questionDetails[id]);
    if (idsToFetch.length > 0) {
      Promise.allSettled(idsToFetch.map((id) => learningCmsService.questions.get(id))).then((results) => {
        const updates: Record<string, any> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled") updates[idsToFetch[i]] = r.value;
        });
        if (Object.keys(updates).length > 0) {
          setQuestionDetails((prev) => ({ ...prev, ...updates }));
        }
      });
    }
  };

  const handleAddQuestionToExam = async (questionId: string) => {
    if (!selectedExam) return;
    try {
      const orderIndex = (selectedExam.questions ?? []).length;
      await learningCmsService.exams.attachQuestion(selectedExam.id, { questionId, orderIndex });
      message.success("Thêm câu hỏi thành công");
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Thêm câu hỏi thất bại"));
    }
  };

  const handleBulkAttachQuestionsToExam = async (items: { questionId: string; orderIndex?: number }[]) => {
    if (!selectedExam) return;
    try {
      await learningCmsService.exams.bulkAttachQuestions(selectedExam.id, { items });
      message.success(`Đã thêm ${items.length} câu hỏi vào đề thi`);
      const updated = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updated);
      loadAllData();
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
      loadAllData();
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
    curriculumForm.setFieldsValue({ code: record.code, title: record.title, levelId: record.levelId, description: record.description });
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
        await learningCmsService.curriculums.update(editingItem.id, { title: values.title, levelId: values.levelId, description: values.description });
        message.success("Cập nhật giáo trình thành công");
      } else {
        await learningCmsService.curriculums.create({ ...values, specializationId: selectedSpecializationId, status: "draft" });
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
      const orderIndex = (selectedCurriculum.exams ?? []).length;
      await learningCmsService.curriculums.attachExam(selectedCurriculum.id, { examId, isRequired: true, orderIndex });
      message.success("Thêm đề thi thành công");
      const updated = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updated);
      loadAllData();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Thêm đề thi thất bại. Đề thi phải ở trạng thái Đã phát hành."));
    }
  };

  const handleRemoveExamFromCurriculum = async (examId: string) => {
    if (!selectedCurriculum) return;
    try {
      await learningCmsService.curriculums.removeExam(selectedCurriculum.id, examId);
      message.success("Gỡ đề thi thành công");
      const updated = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updated);
      loadAllData();
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
          taxSearch={taxSearch}
          onTaxSearchChange={setTaxSearch}
          searchPlaceholder={getSearchPlaceholder()}
          columns={taxColumns}
          dataSource={getTaxData()}
          loading={taxLoading}
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
          <Badge count={questions.length} color="indigo" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <QuestionsTab
          questions={questions}
          skills={skills}
          levels={levels}
          onCreateClick={handleQuestionCreate}
          onEditClick={handleQuestionEdit}
          onDeleteClick={handleQuestionDelete}
          onToggleStatus={handleToggleQuestionStatus}
          onViewVersions={handleViewQuestionVersions}
        />
      ),
    },
    {
      key: "exams",
      label: (
        <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
          <BookOutlined /> Đề thi
          <Badge count={exams.length} color="blue" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <ExamsTab
          exams={exams}
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
          <Badge count={curriculums.length} color="purple" style={{ marginLeft: 4 }} />
        </span>
      ),
      children: (
        <CurriculumsTab
          curriculums={curriculums}
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
    <ConfigProvider theme={ANT_THEME}>
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
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
                  <div className="flex items-center gap-3 bg-slate-50/80 p-2 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center gap-2.5 px-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-xs">
                        <BookOpenIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                        Môn học:
                      </span>
                    </div>
                    <Select
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
                      className="min-w-[240px] sm:min-w-[280px] font-semibold text-sm [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-slate-200 [&_.ant-select-selector]:!bg-white [&_.ant-select-selector]:!shadow-xs hover:[&_.ant-select-selector]:!border-indigo-400 [&_.ant-select-selector]:!h-10 [&_.ant-select-selection-item]:!flex [&_.ant-select-selection-item]:!items-center"
                      popupMatchSelectWidth={false}
                    />
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <Badge count={questions.filter((q) => q.status === "draft").length} overflowCount={99} color="orange">
                    <div className="bg-orange-50/80 border border-orange-100 text-orange-700 px-3.5 py-2 rounded-xl text-xs font-bold">
                      Câu hỏi chờ duyệt
                    </div>
                  </Badge>
                  <Badge count={exams.filter((e) => e.status === "draft").length} overflowCount={99} color="blue">
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
              levels={levels}
            />

            <QuestionFormModal
              open={questionModalOpen}
              onCancel={() => setQuestionModalOpen(false)}
              form={questionForm}
              onFinish={handleQuestionSubmit}
              isEditing={!!editingItem}
              currentType={currentQuestionType}
              onTypeChange={setCurrentQuestionType}
              levels={levels}
              skills={skills}
              topics={topics}
              tags={tags}
              passages={passages}
              filteredMedia={getFilteredMedia()}
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
            />

            <CurriculumFormModal
              open={curriculumModalOpen}
              onCancel={() => setCurriculumModalOpen(false)}
              form={curriculumForm}
              onFinish={handleCurriculumSubmit}
              isEditing={!!editingItem}
              levels={levels}
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
              allQuestions={questions}
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
        </Spin>
      </div>
    </ConfigProvider>
  );
}

import { useEffect, useState, useRef } from "react";
import {
  Button,
  Card,
  Col,
  ConfigProvider,
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
  Upload,
  message,
  Checkbox,
  List,
  Typography,
  Switch,
  Tooltip,
  Badge,
} from "antd";

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  BookOutlined,
  FileTextOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  OrderedListOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SoundOutlined,
  ReadOutlined,
  UploadOutlined,
  EyeOutlined,
  SendOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { learningCmsService } from "../../../services/learningCmsService";
import { resolveMediaUrl } from "../../../services/apiClient";

const { Title, Text, Paragraph } = Typography;

// ==================== QUESTION TYPES ====================
const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Trắc nghiệm (Multiple Choice)" },
  { value: "audio_choice", label: "Nghe & Chọn (Audio Choice)" },
  { value: "image_choice", label: "Ảnh & Chọn (Image Choice)" },
  { value: "word_ordering", label: "Sắp xếp từ (Word Ordering)" },
  { value: "reading_comprehension", label: "Đọc hiểu (Reading Comprehension)" },
  { value: "sentence_rewrite", label: "Viết lại câu (Sentence Rewrite)" },
  { value: "hint_rewrite", label: "Gợi ý viết lại (Hint Rewrite)" },
  { value: "error_correction", label: "Sửa lỗi (Error Correction)" },
  { value: "matching", label: "Ghép đôi (Matching)" },
];

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Trắc nghiệm",
  audio_choice: "Nghe & Chọn",
  image_choice: "Ảnh & Chọn",
  word_ordering: "Sắp xếp từ",
  reading_comprehension: "Đọc hiểu",
  sentence_rewrite: "Viết lại câu",
  hint_rewrite: "Gợi ý viết lại",
  error_correction: "Sửa lỗi",
  matching: "Ghép đôi",
};

const QUESTION_TYPE_COLORS: Record<string, string> = {
  multiple_choice: "blue",
  audio_choice: "cyan",
  image_choice: "geekblue",
  word_ordering: "purple",
  reading_comprehension: "magenta",
  sentence_rewrite: "orange",
  hint_rewrite: "gold",
  error_correction: "red",
  matching: "lime",
};

// Choice-based types that use the options[] array
const CHOICE_TYPES = ["multiple_choice", "audio_choice", "image_choice", "reading_comprehension"];

export default function LearningCms() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("taxonomy");
  const [taxTab, setTaxTab] = useState("levels");

  // ================= DATA STATES =================
  const [levels, setLevels] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [passages, setPassages] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);

  // ================= TAXONOMY SEARCH/FILTER STATES =================
  const [taxSearch, setTaxSearch] = useState("");
  const [debouncedTaxSearch, setDebouncedTaxSearch] = useState("");
  const [taxLoading, setTaxLoading] = useState(false);
  const [filteredLevels, setFilteredLevels] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<any[]>([]);
  const [filteredTags, setFilteredTags] = useState<any[]>([]);

  // Refs for tracking search synchronization
  const prevTabRef = useRef(taxTab);
  const isInitialMount = useRef(true);
  const lastFetchedSearchRef = useRef("");

  // ================= MODAL STATES =================
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [passageModalOpen, setPassageModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [manageQuestionsOpen, setManageQuestionsOpen] = useState(false);
  const [manageExamsOpen, setManageExamsOpen] = useState(false);

  // Editing/Selected Items
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<any>(null);
  const [currentQuestionType, setCurrentQuestionType] = useState<string>("multiple_choice");

  // ================= FORMS =================
  const [taxForm] = Form.useForm();
  const [passageForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [examForm] = Form.useForm();
  const [curriculumForm] = Form.useForm();

  const watchedMediaIds = Form.useWatch("mediaIds", questionForm);

  // Media file state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mediaAlt, setMediaAlt] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  // ================= TAXONOMY SERVICES =================
  const getTaxService = (type: string) => {
    switch (type) {
      case "levels": return learningCmsService.levels;
      case "skills": return learningCmsService.skills;
      case "topics": return learningCmsService.topics;
      case "tags": default: return learningCmsService.tags;
    }
  };

  const loadTaxonomyData = async (tab: string, searchVal: string) => {
    try {
      setTaxLoading(true);
      lastFetchedSearchRef.current = searchVal;
      const res = await getTaxService(tab).list({
        limit: 100,
        search: searchVal || undefined,
        sortBy: "name",
        sortOrder: "ASC",
      });
      const data = res.data || [];

      switch (tab) {
        case "levels":
          setFilteredLevels(data);
          break;
        case "skills":
          setFilteredSkills(data);
          break;
        case "topics":
          setFilteredTopics(data);
          break;
        case "tags":
          setFilteredTags(data);
          break;
      }
    } catch (err) {
      message.error("Tải dữ liệu danh mục thất bại");
    } finally {
      setTaxLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        learningCmsService.levels.list({ limit: 100, sortBy: "name", sortOrder: "ASC" }),        // 0
        learningCmsService.skills.list({ limit: 100, sortBy: "name", sortOrder: "ASC" }),        // 1
        learningCmsService.topics.list({ limit: 100, sortBy: "name", sortOrder: "ASC" }),        // 2
        learningCmsService.tags.list({ limit: 100, sortBy: "name", sortOrder: "ASC" }),          // 3
        learningCmsService.mediaAssets.list({ limit: 100 }),   // 4
        learningCmsService.readingPassages.list({ limit: 100, sortBy: "title", sortOrder: "ASC" }), // 5
        learningCmsService.questions.list({ limit: 100 }),     // 6
        learningCmsService.exams.list({ limit: 100 }),         // 7
        learningCmsService.curriculums.list({ limit: 100 }),   // 8
      ]);

      const get = (i: number) => results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<any>).value : null;
      const failedApis: string[] = [];
      const apiNames = ["Levels", "Skills", "Topics", "Tags", "Media Assets", "Reading Passages", "Questions", "Exams", "Curriculums"];
      results.forEach((r, i) => { if (r.status === "rejected") { failedApis.push(apiNames[i]); console.error(`API ${apiNames[i]} failed:`, (r as PromiseRejectedResult).reason); } });
      if (failedApis.length > 0) {
        message.warning(`Một số API bị lỗi: ${failedApis.join(", ")}. Vui lòng kiểm tra backend.`);
      }

      const levelsData = get(0)?.data || [];
      const skillsData = get(1)?.data || [];
      const topicsData = get(2)?.data || [];
      const tagsData = get(3)?.data || [];

      setLevels(levelsData);
      setSkills(skillsData);
      setTopics(topicsData);
      setTags(tagsData);

      // Initialize filtered data
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

      setMedia(get(4)?.data || []);
      setPassages(get(5)?.data || []);
      setQuestions(get(6)?.data || []);

      // Exam list API does NOT include `questions` array – fetch full details for each
      // exam so the question count is available in the table view.
      const examListData: any[] = get(7)?.data || [];
      if (examListData.length > 0) {
        const examDetails = await Promise.allSettled(
          examListData.map((e: any) => learningCmsService.exams.get(e.id))
        );
        const fullExams = examDetails.map((r, i) =>
          r.status === "fulfilled" ? r.value : examListData[i]
        );
        setExams(fullExams);
      } else {
        setExams([]);
      }

      setCurriculums(get(8)?.data || []);
    } catch (err) {
      message.error("Tải dữ liệu CMS thất bại");
    } finally {
      setLoading(false);
    }
  };

  // Debounce effect for taxonomy search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTaxSearch(taxSearch);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [taxSearch]);

  // Synchronize tab changes and execute taxonomy search query
  useEffect(() => {
    // If the tab changed, reset the search input immediately and load the new tab unfiltered
    if (prevTabRef.current !== taxTab) {
      prevTabRef.current = taxTab;
      setTaxSearch("");
      loadTaxonomyData(taxTab, "");
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Avoid duplicate requests if the search query hasn't changed from what's currently loaded
    if (debouncedTaxSearch === lastFetchedSearchRef.current) {
      return;
    }

    loadTaxonomyData(taxTab, debouncedTaxSearch);
  }, [taxTab, debouncedTaxSearch]);

  // ================= TAXONOMY CRUD =================

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
        } catch {
          message.error("Xóa thất bại");
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
        await getTaxService(taxTab).create(values);
        message.success("Tạo mới thành công");
      }
      loadAllData();
      setTaxModalOpen(false);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Thao tác thất bại";
      message.error(errMsg);
    }
  };

  // ================= MEDIA ASSETS CRUD =================
  const handleMediaUpload = async () => {
    if (!uploadFile) {
      message.warning("Vui lòng chọn tệp để tải lên!");
      return;
    }
    try {
      setUploadLoading(true);
      await learningCmsService.mediaAssets.upload(uploadFile, mediaAlt);
      message.success("Tải lên tệp thành công");
      setUploadFile(null);
      setMediaAlt("");
      setMediaModalOpen(false);
      loadAllData();
    } catch {
      message.error("Tải lên tệp thất bại");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleMediaDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa tệp phương tiện",
      content: "Bạn có chắc chắn muốn xóa tệp này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.mediaAssets.remove(record.id);
          message.success("Xóa tệp thành công");
          loadAllData();
        } catch {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  // ================= READING PASSAGES CRUD =================
  const handlePassageCreate = () => {
    setEditingItem(null);
    passageForm.resetFields();
    setPassageModalOpen(true);
  };

  const handlePassageEdit = (record: any) => {
    setEditingItem(record);
    passageForm.setFieldsValue({
      title: record.title,
      content: record.content,
      source: record.source,
      levelId: record.levelId,
    });
    setPassageModalOpen(true);
  };

  const handlePassageDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa bài đọc",
      content: `Xóa bài đọc "${record.title}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.readingPassages.remove(record.id);
          message.success("Xóa thành công");
          loadAllData();
        } catch {
          message.error("Xóa thất bại");
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
        await learningCmsService.readingPassages.create(values);
        message.success("Tạo bài đọc thành công");
      }
      loadAllData();
      setPassageModalOpen(false);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Thao tác thất bại";
      message.error(errMsg);
    }
  };

  // ================= QUESTIONS CRUD =================
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

      // Flatten detail fields to the Form root level
      const detailFields: any = {};
      if (fullRecord.detail) {
        Object.assign(detailFields, fullRecord.detail);

        // Convert arrays back to space/newline-separated strings for inputs
        if (fullRecord.type === "word_ordering" && Array.isArray(fullRecord.detail.correctTokens)) {
          detailFields.correctTokens = fullRecord.detail.correctTokens.join(" ");
        }
        if ((fullRecord.type === "sentence_rewrite" || fullRecord.type === "hint_rewrite") && Array.isArray(fullRecord.detail.acceptedAnswers)) {
          detailFields.acceptedAnswers = fullRecord.detail.acceptedAnswers.join("\n");
        }
      }

      const mediaIds = (fullRecord.media || []).map((m: any) => ({
        mediaId: m.mediaId || m.media?.id,
        role: m.role,
        orderIndex: m.orderIndex,
      }));

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
        tagIds: (fullRecord.tags || []).map((t: any) => t.id) || [],
        options: fullRecord.options || [],
        mediaIds,
        ...detailFields,
      });
      setQuestionModalOpen(true);
    } catch {
      message.error("Không thể tải chi tiết câu hỏi");
    }
  };

  const handleQuestionDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa câu hỏi",
      content: "Bạn có chắc chắn muốn xóa câu hỏi này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.questions.remove(record.id);
          message.success("Xóa thành công");
          loadAllData();
        } catch {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleQuestionSubmit = async (values: any) => {
    try {
      const qType = values.type;

      // Validate choice-based questions (need at least one correct option)
      if (CHOICE_TYPES.includes(qType)) {
        const hasCorrect = (values.options || []).some((o: any) => o.isCorrect);
        if (!hasCorrect) {
          message.error("Vui lòng chọn ít nhất một đáp án đúng cho câu hỏi.");
          return;
        }
      }

      // Build payload based on question type
      const payload: any = {
        type: qType,
        prompt: values.prompt,
        instruction: values.instruction !== undefined ? values.instruction : editingItem?.instruction,
        explanation: values.explanation !== undefined ? values.explanation : editingItem?.explanation,
        difficultyLevelId: values.difficultyLevelId,
        skillId: values.skillId,
        topicId: values.topicId,
        tagIds: values.tagIds || [],
        status: editingItem?.status || "draft",
        mediaIds: (values.mediaIds || [])
          .filter((m: any) => m && m.mediaId && m.role)
          .map((m: any, idx: number) => ({
            mediaId: m.mediaId,
            role: m.role,
            orderIndex: m.orderIndex !== undefined ? m.orderIndex : idx,
          })),
      };

      if (CHOICE_TYPES.includes(qType)) {
        payload.options = (values.options || []).map((o: any, i: number) => ({
          label: String.fromCharCode(65 + i),
          content: o.content,
          isCorrect: !!o.isCorrect,
          orderIndex: i,
          explanation: o.explanation,
        }));
        payload.detail = {};
        if (qType === "reading_comprehension") {
          payload.detail = { passageId: values.passageId };
        }
      } else if (qType === "word_ordering") {
        payload.options = [];
        payload.detail = {
          correctTokens: (values.correctTokens || "").split(" ").filter(Boolean),
          caseSensitive: !!values.caseSensitive,
          allowPunctuationVariants: !!values.allowPunctuationVariants,
        };
      } else if (qType === "sentence_rewrite") {
        payload.options = [];
        payload.detail = {
          sourceSentence: values.sourceSentence,
          acceptedAnswers: (values.acceptedAnswers || "").split("\n").filter(Boolean),
          gradingMode: values.gradingMode || "normalized",
        };
      } else if (qType === "hint_rewrite") {
        payload.options = [];
        payload.detail = {
          sourceSentence: values.sourceSentence,
          hintWord: values.hintWord,
          acceptedAnswers: (values.acceptedAnswers || "").split("\n").filter(Boolean),
          mustUseHint: !!values.mustUseHint,
          gradingMode: values.gradingMode || "normalized",
        };
      } else if (qType === "error_correction") {
        payload.options = [];
        payload.detail = {
          incorrectSentence: values.prompt,
          correctSentence: values.correctSentence,
          errorSpans: [],
        };
      } else if (qType === "matching") {
        payload.options = [];
        payload.detail = {
          shuffleLeft: !!values.shuffleLeft,
          shuffleRight: !!values.shuffleRight,
          pairs: (values.pairs || []).map((p: any, i: number) => ({
            leftText: p.leftText,
            rightText: p.rightText,
            orderIndex: i,
          })),
        };
      }

      if (editingItem) {
        const { type, status, ...updatePayload } = payload;
        await learningCmsService.questions.update(editingItem.id, updatePayload);
        message.success("Cập nhật câu hỏi thành công");
      } else {
        await learningCmsService.questions.create(payload);
        message.success("Tạo câu hỏi thành công");
      }
      loadAllData();
      setQuestionModalOpen(false);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Thao tác thất bại";
      message.error(errMsg);
    }
  };

  const handleToggleQuestionStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.questions.updateStatus(record.id, {
        status: nextStatus,
        expectedUpdatedAt: record.updatedAt,
      });
      message.success(`Chuyển trạng thái câu hỏi sang ${nextStatus === "published" ? "Đã duyệt" : "Bản nháp"}`);
      loadAllData();
    } catch {
      message.error("Đổi trạng thái thất bại");
    }
  };

  // ================= EXAMS CRUD =================
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
      timeLimitSeconds: record.timeLimitSeconds,
      description: record.description,
    });
    setExamModalOpen(true);
  };

  const handleExamDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa đề thi",
      content: `Xóa đề thi "${record.title}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.exams.remove(record.id);
          message.success("Xóa đề thi thành công");
          loadAllData();
        } catch {
          message.error("Xóa thất bại");
        }
      },
    });
  };

  const handleExamSubmit = async (values: any) => {
    try {
      if (editingItem) {
        await learningCmsService.exams.update(editingItem.id, {
          title: values.title,
          timeLimitSeconds: values.timeLimitSeconds,
          description: values.description,
        });
        message.success("Cập nhật đề thi thành công");
      } else {
        await learningCmsService.exams.create({
          ...values,
          status: "draft",
        });
        message.success("Tạo đề thi thành công");
      }
      loadAllData();
      setExamModalOpen(false);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Thao tác thất bại";
      message.error(errMsg);
    }
  };

  const handleToggleExamStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.exams.updateStatus(record.id, {
        status: nextStatus,
        expectedUpdatedAt: record.updatedAt,
      });
      message.success(`Chuyển trạng thái sang ${nextStatus === "published" ? "Đang phát hành" : "Nháp"}`);
      loadAllData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Đổi trạng thái thất bại";
      message.error(msg);
    }
  };

  // ================= CURRICULUMS CRUD =================
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
    });
    setCurriculumModalOpen(true);
  };

  const handleCurriculumDelete = (record: any) => {
    Modal.confirm({
      title: "Xóa giáo trình",
      content: `Xóa giáo trình "${record.title}"?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await learningCmsService.curriculums.remove(record.id);
          message.success("Xóa giáo trình thành công");
          loadAllData();
        } catch {
          message.error("Xóa thất bại");
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
        });
        message.success("Cập nhật giáo trình thành công");
      } else {
        await learningCmsService.curriculums.create({
          ...values,
          status: "draft",
        });
        message.success("Tạo giáo trình thành công");
      }
      loadAllData();
      setCurriculumModalOpen(false);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || "Thao tác thất bại";
      message.error(errMsg);
    }
  };

  const handleToggleCurriculumStatus = async (record: any) => {
    const nextStatus = record.status === "published" ? "draft" : "published";
    try {
      await learningCmsService.curriculums.updateStatus(record.id, {
        status: nextStatus,
        expectedUpdatedAt: record.updatedAt,
      });
      message.success(`Chuyển trạng thái sang ${nextStatus === "published" ? "Đang phát hành" : "Nháp"}`);
      loadAllData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Đổi trạng thái thất bại";
      message.error(msg);
    }
  };

  // ================= RELATIONSHIP MAPPING HANDLERS =================
  const handleOpenQuestions = async (exam: any) => {
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
      const currentQuestions = selectedExam.questions || [];
      const orderIndex = currentQuestions.length;
      await learningCmsService.exams.attachQuestion(selectedExam.id, {
        questionId,
        orderIndex,
      });
      message.success("Thêm câu hỏi thành công");
      const updatedExam = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updatedExam);
      loadAllData();
    } catch (err: any) {
      const msg = err?.message || "Thêm câu hỏi thất bại";
      message.error(msg);
    }
  };

  const handleRemoveQuestionFromExam = async (questionId: string) => {
    if (!selectedExam) return;
    try {
      await learningCmsService.exams.removeQuestion(selectedExam.id, questionId);
      message.success("Gỡ câu hỏi thành công");
      const updatedExam = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updatedExam);
      loadAllData();
    } catch {
      message.error("Gỡ câu hỏi thất bại");
    }
  };

  const handleReorderExamQuestions = async (index: number, direction: "up" | "down") => {
    if (!selectedExam) return;
    const items = [...(selectedExam.questions || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    try {
      await learningCmsService.exams.reorderQuestions(selectedExam.id, {
        items: items.map((q: any, i: number) => ({ questionId: q.questionId, orderIndex: i })),
      });
      message.success("Sắp xếp lại thành công");
      const updatedExam = await learningCmsService.exams.get(selectedExam.id);
      setSelectedExam(updatedExam);
    } catch {
      message.error("Sắp xếp lại thất bại");
    }
  };

  // Curriculum to Exams Mapping
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
      const currentExams = selectedCurriculum.exams || [];
      const orderIndex = currentExams.length;
      await learningCmsService.curriculums.attachExam(selectedCurriculum.id, {
        examId,
        isRequired: true,
        orderIndex,
      });
      message.success("Thêm đề thi thành công");
      const updatedCurr = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updatedCurr);
      loadAllData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Thêm đề thi thất bại. Đề thi phải ở trạng thái Đã phát hành.";
      message.error(msg);
    }
  };

  const handleRemoveExamFromCurriculum = async (examId: string) => {
    if (!selectedCurriculum) return;
    try {
      await learningCmsService.curriculums.removeExam(selectedCurriculum.id, examId);
      message.success("Gỡ đề thi thành công");
      const updatedCurr = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updatedCurr);
      loadAllData();
    } catch {
      message.error("Gỡ đề thi thất bại");
    }
  };

  const handleReorderCurriculumExams = async (index: number, direction: "up" | "down") => {
    if (!selectedCurriculum) return;
    const items = [...(selectedCurriculum.exams || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
    try {
      await learningCmsService.curriculums.reorderExams(selectedCurriculum.id, {
        items: items.map((e: any, i: number) => ({ examId: e.examId, orderIndex: i })),
      });
      message.success("Sắp xếp lại thành công");
      const updatedCurr = await learningCmsService.curriculums.get(selectedCurriculum.id);
      setSelectedCurriculum(updatedCurr);
    } catch {
      message.error("Sắp xếp lại thất bại");
    }
  };

  // ================= RENDERING HELPERS =================
  const getTaxData = () => {
    switch (taxTab) {
      case "levels": return filteredLevels;
      case "skills": return filteredSkills;
      case "topics": return filteredTopics;
      case "tags": default: return filteredTags;
    }
  };

  const getSearchPlaceholder = () => {
    switch (taxTab) {
      case "levels": return "Tìm kiếm Level (mã, tên)...";
      case "skills": return "Tìm kiếm kỹ năng (mã, tên)...";
      case "topics": return "Tìm kiếm chủ đề (mã, tên)...";
      case "tags": return "Tìm kiếm thẻ gắn (mã, tên)...";
      default: return "Tìm kiếm...";
    }
  };

  const statusTag = (status: string) => {
    if (status === "published") return <Tag color="success" className="rounded-full border-none text-xs font-semibold">✓ Đã duyệt</Tag>;
    if (status === "archived") return <Tag color="default" className="rounded-full border-none text-xs font-semibold">Lưu trữ</Tag>;
    return <Tag color="warning" className="rounded-full border-none text-xs font-semibold">Nháp</Tag>;
  };

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
    {
      title: "Mô tả",
      dataIndex: "description",
      render: (val: string) => <span className="text-slate-500 text-sm">{val || "—"}</span>,
    },
    taxTab === "topics" ? {
      title: "Chủ đề cha",
      dataIndex: "parentId",
      render: (val: string) => {
        const parent = topics.find((t) => t.id === val);
        return parent ? <Tag color="blue" className="rounded">{parent.name}</Tag> : <span className="text-slate-400">—</span>;
      },
    } : null,
    {
      title: "Thao tác",
      align: "right" as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
            onClick={() => handleTaxEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
            onClick={() => handleTaxDelete(record)}
          />
        </Space>
      ),
    },
  ].filter(Boolean) as any[];

  // Helpers for filtering media based on question type
  const getFilteredMedia = () => {
    if (currentQuestionType === "image_choice") {
      return media.filter(
        (m) => m.type === "image" || m.mimeType?.startsWith("image")
      );
    }
    if (currentQuestionType === "audio_choice") {
      return media.filter(
        (m) => m.type === "audio" || m.mimeType?.startsWith("audio")
      );
    }
    return media;
  };

  const getAvailableRoles = () => {
    if (currentQuestionType === "image_choice") {
      return [{ value: "prompt_image", label: "🖼️ Hình ảnh đề bài" }];
    }
    if (currentQuestionType === "audio_choice") {
      return [{ value: "prompt_audio", label: "🔊 Âm thanh đề bài" }];
    }
    return [
      { value: "prompt_audio", label: "🔊 Âm thanh đề bài" },
      { value: "prompt_image", label: "🖼️ Hình ảnh đề bài" },
    ];
  };

  // ==================== QUESTION TYPE-SPECIFIC FORM FIELDS ====================
  const renderQuestionDetailFields = () => {
    const type = currentQuestionType;

    if (CHOICE_TYPES.includes(type)) {
      return (
        <>
          {type === "reading_comprehension" && (
            <Form.Item name="passageId" label="Bài đọc liên quan" rules={[{ required: true, message: "Chọn bài đọc!" }]}>
              <Select placeholder="Chọn bài đọc..." className="rounded-xl">
                {passages.map((p) => (
                  <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <Text className="text-sm font-semibold text-slate-700">Phương án trả lời</Text>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ content: "", isCorrect: false })}>
                    Thêm đáp án
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }, idx) => (
                  <div key={key} className="flex gap-2 items-start bg-slate-50 p-2 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0 mt-1">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1">
                      <Form.Item
                        {...restField}
                        name={[name, "content"]}
                        rules={[{ required: true, message: "Nhập nội dung!" }]}
                        className="mb-1"
                      >
                        <Input placeholder="Nội dung đáp án" className="rounded-lg" />
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, "explanation"]}
                        className="mb-0"
                      >
                        <Input placeholder="Giải thích đáp án này (tuỳ chọn)" className="rounded-lg text-xs" size="small" />
                      </Form.Item>
                    </div>
                    <Form.Item
                      {...restField}
                      name={[name, "isCorrect"]}
                      valuePropName="checked"
                      className="mb-0 mt-1"
                    >
                      <Checkbox className="text-emerald-600 font-semibold">Đúng</Checkbox>
                    </Form.Item>
                    {fields.length > 2 && (
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} className="mt-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Form.List>
        </>
      );
    }

    if (type === "word_ordering") {
      return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
          <Text className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình sắp xếp từ</Text>
          <Form.Item name="correctTokens" label="Các từ theo thứ tự đúng (cách nhau bởi dấu cách)" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: I am a student" className="rounded-xl font-mono" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="caseSensitive" valuePropName="checked" label="Phân biệt hoa thường">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="allowPunctuationVariants" valuePropName="checked" label="Chấp nhận biến thể dấu câu">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </div>
      );
    }

    if (type === "sentence_rewrite") {
      return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
          <Text className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình viết lại câu</Text>
          <Form.Item name="sourceSentence" label="Câu nguồn" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Câu gốc để học sinh viết lại..." rows={2} className="rounded-xl" />
          </Form.Item>
          <Form.Item name="acceptedAnswers" label="Đáp án chấp nhận (mỗi dòng một đáp án)" rules={[{ required: true }]}>
            <Input.TextArea placeholder="It is not warm enough to swim.&#10;Swimming is impossible due to the cold." rows={3} className="rounded-xl font-mono" />
          </Form.Item>
          <Form.Item name="gradingMode" label="Chế độ chấm điểm">
            <Select className="rounded-xl">
              <Select.Option value="normalized">Normalized (bỏ qua hoa thường & dấu cách)</Select.Option>
              <Select.Option value="exact">Exact (chính xác tuyệt đối)</Select.Option>
            </Select>
          </Form.Item>
        </div>
      );
    }

    if (type === "hint_rewrite") {
      return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
          <Text className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình viết lại có gợi ý</Text>
          <Form.Item name="sourceSentence" label="Câu nguồn" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Câu gốc..." rows={2} className="rounded-xl" />
          </Form.Item>
          <Form.Item name="hintWord" label="Từ gợi ý (hint word)" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: since" className="rounded-xl font-mono" />
          </Form.Item>
          <Form.Item name="acceptedAnswers" label="Đáp án chấp nhận (mỗi dòng một đáp án)" rules={[{ required: true }]}>
            <Input.TextArea placeholder="She has learned English since 2020." rows={3} className="rounded-xl font-mono" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mustUseHint" valuePropName="checked" label="Bắt buộc dùng từ gợi ý">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gradingMode" label="Chế độ chấm">
                <Select className="rounded-xl">
                  <Select.Option value="normalized">Normalized</Select.Option>
                  <Select.Option value="exact">Exact</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      );
    }

    if (type === "error_correction") {
      return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
          <Text className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình sửa lỗi</Text>
          <Form.Item name="correctSentence" label="Đáp án" rules={[{ required: true }]}>
            <Input.TextArea placeholder="Câu đã sửa đúng..." rows={2} className="rounded-xl" />
          </Form.Item>
        </div>
      );
    }

    if (type === "matching") {
      return (
        <div className="bg-slate-50 p-4 rounded-xl space-y-3">
          <Text className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình ghép đôi</Text>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="shuffleLeft" valuePropName="checked" label="Xáo trộn cột trái">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shuffleRight" valuePropName="checked" label="Xáo trộn cột phải">
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
          <Form.List name="pairs">
            {(fields, { add, remove }) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Text className="text-xs font-semibold text-slate-600">Các cặp ghép đôi</Text>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ leftText: "", rightText: "" })}>
                    Thêm cặp
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: "flex" }} align="baseline">
                    <Form.Item {...restField} name={[name, "leftText"]} rules={[{ required: true }]}>
                      <Input placeholder="Cột trái" className="rounded-lg w-36" />
                    </Form.Item>
                    <span className="text-slate-400">↔</span>
                    <Form.Item {...restField} name={[name, "rightText"]} rules={[{ required: true }]}>
                      <Input placeholder="Cột phải" className="rounded-lg w-36" />
                    </Form.Item>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Space>
                ))}
              </div>
            )}
          </Form.List>
        </div>
      );
    }

    return null;
  };

  // ==================== MAIN RENDER ====================
  return (
    <ConfigProvider
      theme={{
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
      }}
    >
      <div className="min-h-screen bg-slate-50/50 py-6 px-4 sm:px-6">
        <Spin spinning={loading} size="large">
          <div className="max-w-[1500px] mx-auto space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div>
                <Title level={2} className="!mb-0.5 !text-slate-800 font-extrabold tracking-tight">
                  Learning CMS Dashboard
                </Title>
                <Text className="text-slate-400 text-sm">
                  Quản lý ngân hàng câu hỏi, bài đọc, đề kiểm tra và giáo trình giảng dạy
                </Text>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Badge count={questions.filter((q) => q.status === "draft").length} overflowCount={99} color="orange">
                  <div className="bg-orange-50 text-orange-700 px-4 py-2 rounded-xl text-sm font-semibold">
                    Câu hỏi chờ duyệt
                  </div>
                </Badge>
                <Badge count={exams.filter((e) => e.status === "draft").length} overflowCount={99} color="blue">
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold">
                    Đề thi nháp
                  </div>
                </Badge>
              </div>
            </div>

            {/* TAB SECTION */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                size="large"
                items={[
                  {
                    key: "taxonomy",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <OrderedListOutlined /> Taxonomy
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                          <Tabs
                            type="card"
                            activeKey={taxTab}
                            onChange={setTaxTab}
                            className="!mb-0"
                            items={[
                              { key: "levels", label: "🎯 Level" },
                              { key: "skills", label: "💡 Kỹ năng" },
                              { key: "topics", label: "📂 Chủ đề" },
                              { key: "tags", label: "🏷️ Thẻ gắn" },
                            ]}
                          />
                          <div className="flex items-center gap-3">
                            <Input
                              placeholder={getSearchPlaceholder()}
                              allowClear
                              prefix={<SearchOutlined className="text-slate-400" />}
                              value={taxSearch}
                              onChange={(e) => setTaxSearch(e.target.value)}
                              className="rounded-xl w-64 shadow-sm border-slate-200"
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleTaxCreate}
                              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                            >
                              Tạo mới
                            </Button>
                          </div>
                        </div>

                        <Table
                          rowKey="id"
                          loading={taxLoading}
                          dataSource={getTaxData()}
                          columns={taxColumns}
                          pagination={{ pageSize: 15, showSizeChanger: false }}
                          locale={{ emptyText: "Không tìm thấy danh mục nào" }}
                          className="border border-slate-100 rounded-2xl overflow-hidden"
                        />
                      </div>
                    ),
                  },
                  {
                    key: "media",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <PictureOutlined /> Media Assets
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-500">
                            Thư viện hình ảnh, tệp tin âm thanh hoặc video cho câu hỏi ({media.length} tệp)
                          </Text>
                          <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => {
                              setUploadFile(null);
                              setMediaAlt("");
                              setMediaModalOpen(true);
                            }}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tải lên tệp
                          </Button>
                        </div>

                        <Row gutter={[16, 16]}>
                          {media.map((asset) => (
                            <Col xs={12} sm={8} md={6} lg={4} key={asset.id}>
                              <Card
                                hoverable
                                className="overflow-hidden border-slate-100 rounded-2xl relative group"
                                cover={
                                  <div className="h-32 bg-slate-50 flex items-center justify-center overflow-hidden">
                                    {asset.type === "image" || asset.mimeType?.startsWith("image") ? (
                                      <img
                                        src={resolveMediaUrl(asset.url)}
                                        alt={asset.altText}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : asset.type === "audio" || asset.mimeType?.startsWith("audio") ? (
                                      <div className="text-4xl text-slate-400 flex flex-col items-center gap-1">
                                        <SoundOutlined />
                                        <span className="text-xs text-slate-400">Audio</span>
                                      </div>
                                    ) : (
                                      <div className="text-4xl text-slate-400">📹</div>
                                    )}
                                  </div>
                                }
                              >
                                <Card.Meta
                                  title={
                                    <span className="text-xs font-semibold block truncate">
                                      {asset.altText || "Tệp không tên"}
                                    </span>
                                  }
                                  description={
                                    <div className="flex justify-between items-center mt-1">
                                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">
                                        {asset.type || "File"}
                                      </span>
                                      <Space size={2}>
                                        <Tooltip title="Xem ID">
                                          <Button
                                            type="text"
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() => {
                                              navigator.clipboard.writeText(asset.id);
                                              message.success("Đã copy ID");
                                            }}
                                          />
                                        </Tooltip>
                                        <Button
                                          type="text"
                                          size="small"
                                          danger
                                          icon={<DeleteOutlined />}
                                          onClick={() => handleMediaDelete(asset)}
                                        />
                                      </Space>
                                    </div>
                                  }
                                />
                              </Card>
                            </Col>
                          ))}

                          {media.length === 0 && (
                            <Col span={24}>
                              <Empty description="Thư viện tệp trống" />
                            </Col>
                          )}
                        </Row>
                      </div>
                    ),
                  },
                  {
                    key: "passages",
                    label: (
                      <span className="flex items-center gap-2 px-1 py-1.5 text-sm font-bold">
                        <ReadOutlined /> Bài đọc
                      </span>
                    ),
                    children: (
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-500">Danh sách bài đọc cho phần Đọc hiểu ({passages.length} bài)</Text>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handlePassageCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo bài đọc mới
                          </Button>
                        </div>

                        <Table
                          rowKey="id"
                          dataSource={passages}
                          columns={[
                            {
                              title: "Tiêu đề",
                              dataIndex: "title",
                              render: (val: string, record: any) => (
                                <div>
                                  <div className="font-semibold text-slate-800">{val}</div>
                                  <div className="text-xs text-slate-400">
                                    {record.source ? `📚 ${record.source}` : "—"} •{" "}
                                    {record.level ? `🎯 ${record.level.name}` : "Chưa chọn level"}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: "Xem trước nội dung",
                              dataIndex: "content",
                              render: (val: string) => (
                                <Paragraph className="text-xs text-slate-500 max-w-lg mb-0 line-clamp-2">
                                  {val}
                                </Paragraph>
                              ),
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
                                    onClick={() => handlePassageEdit(record)}
                                  />
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                                    onClick={() => handlePassageDelete(record)}
                                  />
                                </Space>
                              ),
                            },
                          ]}
                          pagination={{ pageSize: 8 }}
                        />
                      </div>
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
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-500">
                            Ngân hàng câu hỏi — {questions.filter((q) => q.status === "published").length}/{questions.length} đã duyệt
                          </Text>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleQuestionCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo câu hỏi mới
                          </Button>
                        </div>

                        <Table
                          rowKey="id"
                          dataSource={questions}
                          columns={[
                            {
                              title: "Đề bài",
                              dataIndex: "prompt",
                              render: (val: string, record: any) => (
                                <div>
                                  <div
                                    className="font-semibold text-slate-800 text-sm line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: val }}
                                  />
                                  <Tag
                                    color={QUESTION_TYPE_COLORS[record.type] || "default"}
                                    className="rounded border-none text-[10px] mt-1.5 font-bold uppercase"
                                  >
                                    {QUESTION_TYPE_LABELS[record.type] || record.type}
                                  </Tag>
                                </div>
                              ),
                            },
                            {
                              title: "Phân loại",
                              render: (_: any, record: any) => {
                                const skill = skills.find((s) => s.id === record.skillId);
                                const level = levels.find((l) => l.id === record.difficultyLevelId);
                                return (
                                  <div className="text-xs text-slate-500 space-y-0.5">
                                    {skill && <div>💡 {skill.name}</div>}
                                    {level && <div>🎯 {level.name}</div>}
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Trạng thái",
                              dataIndex: "status",
                              render: (val: string) => statusTag(val),
                            },
                            {
                              title: "Thao tác",
                              align: "right" as const,
                              render: (_: any, record: any) => (
                                <Space size="small">
                                  <Tooltip title={record.status === "published" ? "Chuyển về Nháp" : "Duyệt & Phát hành"}>
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={record.status === "published" ? <CloseCircleOutlined className="text-orange-400" /> : <CheckCircleOutlined className="text-emerald-500" />}
                                      onClick={() => handleToggleQuestionStatus(record)}
                                    />
                                  </Tooltip>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
                                    onClick={() => handleQuestionEdit(record)}
                                  />
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                                    onClick={() => handleQuestionDelete(record)}
                                  />
                                </Space>
                              ),
                            },
                          ]}
                          pagination={{ pageSize: 10 }}
                        />
                      </div>
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
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-500">
                            Quản lý đề thi — {exams.filter((e) => e.status === "published").length}/{exams.length} đang phát hành
                          </Text>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleExamCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo đề thi mới
                          </Button>
                        </div>

                        <Table
                          rowKey="id"
                          dataSource={exams}
                          columns={[
                            {
                              title: "Đề thi",
                              dataIndex: "title",
                              render: (val: string, record: any) => (
                                <div>
                                  <div className="font-bold text-slate-800">{val}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                                    {record.code} • ⏱ {record.timeLimitSeconds ? Math.round(record.timeLimitSeconds / 60) + " phút" : "Không giới hạn"}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: "Câu hỏi",
                              render: (_: any, record: any) => {
                                const count = record.questions?.length || 0;
                                return (
                                  <div className="text-center">
                                    <div className="font-bold text-lg text-slate-700">{count}</div>
                                    <div className="text-xs text-slate-400">câu</div>
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Trạng thái",
                              dataIndex: "status",
                              render: (val: string, record: any) => (
                                <Tooltip title={val === "published" ? "Click để chuyển về Nháp" : "Click để Phát hành"}>
                                  <Tag
                                    color={val === "published" ? "success" : "default"}
                                    onClick={() => handleToggleExamStatus(record)}
                                    className="cursor-pointer rounded-full px-2.5 py-0.5 border-none text-xs font-semibold"
                                  >
                                    {val === "published" ? "✓ Đang phát hành" : "Nháp"}
                                  </Tag>
                                </Tooltip>
                              ),
                            },
                            {
                              title: "Thao tác",
                              align: "right" as const,
                              render: (_: any, record: any) => (
                                <Space size="small">
                                  <Button
                                    type="dashed"
                                    size="small"
                                    onClick={() => handleOpenQuestions(record)}
                                    className="text-xs font-semibold border-indigo-200 text-indigo-600 rounded-lg hover:border-indigo-500"
                                  >
                                    Cấu hình câu hỏi
                                  </Button>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
                                    onClick={() => handleExamEdit(record)}
                                  />
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                                    onClick={() => handleExamDelete(record)}
                                  />
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </div>
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
                      <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center">
                          <Text className="text-slate-500">
                            Giáo trình đào tạo — {curriculums.filter((c) => c.status === "published").length}/{curriculums.length} đang phát hành
                          </Text>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCurriculumCreate}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
                          >
                            Tạo giáo trình mới
                          </Button>
                        </div>

                        <Table
                          rowKey="id"
                          dataSource={curriculums}
                          columns={[
                            {
                              title: "Giáo trình",
                              dataIndex: "title",
                              render: (val: string, record: any) => (
                                <div>
                                  <div className="font-bold text-slate-800">{val}</div>
                                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                                    {record.code}
                                    {record.level && ` • 🎯 ${record.level.name}`}
                                  </div>
                                </div>
                              ),
                            },
                            {
                              title: "Đề thi",
                              render: (_: any, record: any) => {
                                const count = record.exams?.length || 0;
                                const required = (record.exams || []).filter((e: any) => e.isRequired).length;
                                return (
                                  <div className="text-center">
                                    <div className="font-bold text-lg text-slate-700">{count}</div>
                                    <div className="text-xs text-slate-400">{required} bắt buộc</div>
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Trạng thái",
                              dataIndex: "status",
                              render: (val: string, record: any) => (
                                <Tooltip title={val === "published" ? "Click để chuyển về Nháp" : "Click để Phát hành (cần ít nhất 1 đề thi đã phát hành)"}>
                                  <Tag
                                    color={val === "published" ? "success" : "default"}
                                    onClick={() => handleToggleCurriculumStatus(record)}
                                    className="cursor-pointer rounded-full px-2.5 py-0.5 border-none text-xs font-semibold"
                                  >
                                    {val === "published" ? "✓ Đang phát hành" : "Nháp"}
                                  </Tag>
                                </Tooltip>
                              ),
                            },
                            {
                              title: "Thao tác",
                              align: "right" as const,
                              render: (_: any, record: any) => (
                                <Space size="small">
                                  <Button
                                    type="dashed"
                                    size="small"
                                    onClick={() => handleOpenExams(record)}
                                    className="text-xs font-semibold border-purple-200 text-purple-600 rounded-lg hover:border-purple-500"
                                  >
                                    Cấu hình đề thi
                                  </Button>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined className="text-slate-400 hover:text-indigo-600" />}
                                    onClick={() => handleCurriculumEdit(record)}
                                  />
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined className="text-slate-400 hover:text-rose-600" />}
                                    onClick={() => handleCurriculumDelete(record)}
                                  />
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* ========== MODALS ========== */}

            {/* CREATE/EDIT TAXONOMY MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <OrderedListOutlined className="text-indigo-600" />
                  {editingItem ? "Chỉnh sửa danh mục" : `Tạo mới ${taxTab === "levels" ? "Level" : taxTab === "skills" ? "Kỹ năng" : taxTab === "topics" ? "Chủ đề" : "Thẻ gắn"}`}
                </div>
              }
              open={taxModalOpen}
              onCancel={() => setTaxModalOpen(false)}
              onOk={() => taxForm.submit()}
              className="rounded-2xl"
              okText="Lưu lại"
              cancelText="Hủy"
            >
              <Form form={taxForm} layout="vertical" onFinish={handleTaxSubmit} className="pt-2">
                <Form.Item name="code" label="Mã" rules={[{ required: true, message: "Nhập mã!" }]}>
                  <Input
                    placeholder="Mã không dấu, viết liền (vd: beginner_a1)"
                    disabled={!!editingItem}
                    className="rounded-xl font-mono"
                  />
                </Form.Item>
                <Form.Item name="name" label="Tên" rules={[{ required: true, message: "Nhập tên!" }]}>
                  <Input placeholder="Tên hiển thị" className="rounded-xl" />
                </Form.Item>
                {taxTab === "levels" && (
                  <Form.Item name="rank" label="Thứ tự (Rank)">
                    <InputNumber style={{ width: "100%" }} min={0} placeholder="Thứ tự sắp xếp" className="rounded-xl" />
                  </Form.Item>
                )}
                {taxTab === "topics" && (
                  <Form.Item name="parentId" label="Chủ đề cha (nếu có)">
                    <Select placeholder="Chọn chủ đề cha..." className="rounded-xl" allowClear>
                      {topics.filter((t) => t.id !== editingItem?.id).map((t) => (
                        <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
                <Form.Item name="description" label="Mô tả">
                  <Input.TextArea placeholder="Mô tả chi tiết..." rows={3} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* MEDIA UPLOAD MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <UploadOutlined className="text-indigo-600" />
                  Tải lên tệp phương tiện
                </div>
              }
              open={mediaModalOpen}
              onCancel={() => setMediaModalOpen(false)}
              onOk={handleMediaUpload}
              confirmLoading={uploadLoading}
              className="rounded-2xl"
              okText="Tải lên"
              cancelText="Hủy"
            >
              <div className="space-y-4 pt-2">
                <Upload
                  beforeUpload={(file) => {
                    setUploadFile(file);
                    return false;
                  }}
                  maxCount={1}
                  onRemove={() => setUploadFile(null)}
                  accept="image/*,audio/*,video/*"
                >
                  <Button icon={<UploadOutlined />} className="rounded-xl">Chọn tệp (ảnh, âm thanh, video)</Button>
                </Upload>
                {uploadFile && (
                  <div className="bg-indigo-50 px-3 py-2 rounded-lg text-xs text-indigo-700">
                    📎 Đã chọn: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                <div className="space-y-1">
                  <Text className="text-xs text-slate-500">Mô tả văn bản thay thế (Alt Text)</Text>
                  <Input
                    placeholder="Mô tả ngắn gọn nội dung tệp..."
                    value={mediaAlt}
                    onChange={(e) => setMediaAlt(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </Modal>

            {/* READING PASSAGE MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <ReadOutlined className="text-indigo-600" />
                  {editingItem ? "Cập nhật Bài đọc" : "Tạo Bài đọc mới"}
                </div>
              }
              open={passageModalOpen}
              onCancel={() => setPassageModalOpen(false)}
              onOk={() => passageForm.submit()}
              width={680}
              className="rounded-2xl"
              okText="Lưu lại"
              cancelText="Hủy"
            >
              <Form form={passageForm} layout="vertical" onFinish={handlePassageSubmit} className="pt-2">
                <Form.Item name="title" label="Tiêu đề bài đọc" rules={[{ required: true, message: "Nhập tiêu đề!" }]}>
                  <Input placeholder="Tiêu đề..." className="rounded-xl" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="source" label="Nguồn tài liệu">
                      <Input placeholder="Nguồn trích dẫn..." className="rounded-xl" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="levelId" label="Level (Độ khó)">
                      <Select placeholder="Chọn level..." className="rounded-xl" allowClear>
                        {levels.map((l) => (
                          <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="content" label="Nội dung bài đọc" rules={[{ required: true, message: "Nhập nội dung!" }]}>
                  <Input.TextArea placeholder="Nhập văn bản bài đọc chi tiết..." rows={10} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* CREATE/EDIT QUESTION MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <QuestionCircleOutlined className="text-indigo-600" />
                  {editingItem ? "Cập nhật câu hỏi" : "Tạo câu hỏi mới"}
                </div>
              }
              open={questionModalOpen}
              onCancel={() => setQuestionModalOpen(false)}
              onOk={() => questionForm.submit()}
              width={800}
              className="rounded-2xl"
              okText="Lưu lại"
              cancelText="Hủy"
            >
              <Form form={questionForm} layout="vertical" onFinish={handleQuestionSubmit} className="pt-2">
                {/* Type and Classification */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="type" label="Loại câu hỏi" rules={[{ required: true }]}>
                      <Select
                        className="rounded-xl"
                        disabled={!!editingItem}
                        onChange={(val) => {
                          setCurrentQuestionType(val);
                          // Reset type-specific fields
                          questionForm.setFieldsValue({ options: [], pairs: [], correctTokens: "", acceptedAnswers: "", passageId: undefined });
                          if (CHOICE_TYPES.includes(val)) {
                            questionForm.setFieldsValue({
                              options: [
                                { label: "A", content: "", isCorrect: false },
                                { label: "B", content: "", isCorrect: false },
                              ],
                            });
                          }
                        }}
                      >
                        {QUESTION_TYPES.map((qt) => (
                          <Select.Option key={qt.value} value={qt.value}>{qt.label}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="difficultyLevelId" label="Level độ khó">
                      <Select className="rounded-xl" placeholder="Chọn level" allowClear>
                        {levels.map((l) => (
                          <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="skillId" label="Kỹ năng">
                      <Select className="rounded-xl" placeholder="Chọn kỹ năng" allowClear>
                        {skills.map((s) => (
                          <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="topicId" label="Chủ đề">
                      <Select className="rounded-xl" placeholder="Chọn chủ đề" allowClear>
                        {topics.map((t) => (
                          <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="tagIds" label="Thẻ gắn">
                  <Select mode="multiple" className="rounded-xl" placeholder="Chọn các thẻ..." allowClear>
                    {tags.map((t) => (
                      <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Divider className="my-3" />

                <Form.Item
                  name="prompt"
                  label={currentQuestionType === "error_correction" ? "Đề bài" : "Nội dung câu hỏi (Đề bài)"}
                  rules={[{ required: true }]}
                >
                  <Input.TextArea
                    placeholder={currentQuestionType === "error_correction" ? "Ví dụ: She go to school by bus every day." : "Câu hỏi hiển thị cho học sinh..."}
                    rows={3}
                    className="rounded-xl"
                  />
                </Form.Item>

                <Divider className="my-3" />

                {/* Media Assets Section */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Text className="text-sm font-semibold text-slate-700">Tệp tin đa phương tiện (Media)</Text>
                  </div>
                  <Form.List name="mediaIds">
                    {(mediaFields, { add, remove }) => (
                      <div className="space-y-2">
                        {mediaFields.map(({ key, name, ...restField }) => {
                          const currentMediaId = questionForm.getFieldValue(["mediaIds", name, "mediaId"]);
                          const selectedAsset = media.find((m) => m.id === currentMediaId);

                          return (
                            <div key={key} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl">
                              <Form.Item
                                {...restField}
                                name={[name, "mediaId"]}
                                rules={[{ required: true, message: "Chọn tệp media!" }]}
                                className="mb-0 flex-1"
                              >
                                <Select
                                  placeholder="Chọn tệp tin (ảnh, âm thanh, video)"
                                  className="rounded-lg w-full"
                                  allowClear
                                  onChange={() => {
                                    const roles = getAvailableRoles();
                                    if (roles.length === 1) {
                                      questionForm.setFieldValue(["mediaIds", name, "role"], roles[0].value);
                                    }
                                  }}
                                >
                                  {getFilteredMedia().map((asset) => (
                                    <Select.Option key={asset.id} value={asset.id}>
                                      [{asset.type.toUpperCase()}] {asset.altText || asset.url.split("/").pop()}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, "role"]}
                                rules={[{ required: true, message: "Chọn vai trò!" }]}
                                className="mb-0 w-44"
                              >
                                <Select placeholder="Vai trò" className="rounded-lg">
                                  {getAvailableRoles().map((r) => (
                                    <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>

                              {/* Preview thumbnail */}
                              {selectedAsset && (
                                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                  {selectedAsset.type === "image" || selectedAsset.mimeType?.startsWith("image") ? (
                                    <img
                                      src={resolveMediaUrl(selectedAsset.url)}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : selectedAsset.type === "audio" || selectedAsset.mimeType?.startsWith("audio") ? (
                                    <SoundOutlined className="text-lg text-indigo-600" />
                                  ) : (
                                    <span className="text-lg">📹</span>
                                  )}
                                </div>
                              )}

                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                                className="shrink-0"
                              />
                            </div>
                          );
                        })}
                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const roles = getAvailableRoles();
                            const defaultRole = roles.length === 1 ? roles[0].value : "prompt_image";
                            add({ mediaId: undefined, role: defaultRole });
                          }}
                          className="w-full rounded-xl"
                        >
                          Thêm liên kết Media
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </div>

                <Divider className="my-3" />

                {/* Type-specific fields */}
                {renderQuestionDetailFields()}

                <Divider className="my-3" />

                <Form.Item name="explanation" label="Giải thích đáp án (Giải thích chi tiết)">
                  <Input.TextArea placeholder="Nhập phần giải thích đáp án hiển thị sau khi học sinh nộp bài..." rows={3} className="rounded-xl" />
                </Form.Item>
              </Form>
            </Modal>

            {/* CREATE/EDIT EXAM MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <BookOutlined className="text-indigo-600" />
                  {editingItem ? "Cập nhật Đề thi" : "Tạo Đề thi mới"}
                </div>
              }
              open={examModalOpen}
              onCancel={() => setExamModalOpen(false)}
              onOk={() => examForm.submit()}
              className="rounded-2xl"
              okText="Lưu lại"
              cancelText="Hủy"
            >
              <Form form={examForm} layout="vertical" onFinish={handleExamSubmit} className="pt-2">
                <Form.Item name="code" label="Mã đề thi" rules={[{ required: !editingItem }]}>
                  <Input placeholder="Ví dụ: EXAM_A1_001" disabled={!!editingItem} className="rounded-xl font-mono" />
                </Form.Item>
                <Form.Item name="title" label="Tiêu đề đề thi" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: Đề kiểm tra giữa kỳ 1" className="rounded-xl" />
                </Form.Item>
                <Form.Item name="timeLimitSeconds" label="Thời gian làm bài (giây)" rules={[{ required: true }]}>
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="Ví dụ: 2700 (= 45 phút)"
                    className="rounded-xl"
                  />
                </Form.Item>
                <Form.Item name="description" label="Mô tả chi tiết">
                  <Input.TextArea placeholder="Mô tả đề thi..." rows={3} className="rounded-xl" />
                </Form.Item>
                {!editingItem && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    💡 Đề thi sẽ được tạo ở trạng thái <strong>Nháp</strong>. Sau khi thêm câu hỏi (đã duyệt), bạn có thể Phát hành đề thi.
                  </div>
                )}
              </Form>
            </Modal>

            {/* CREATE/EDIT CURRICULUM MODAL */}
            <Modal
              title={
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-purple-600" />
                  {editingItem ? "Cập nhật Giáo trình" : "Tạo Giáo trình mới"}
                </div>
              }
              open={curriculumModalOpen}
              onCancel={() => setCurriculumModalOpen(false)}
              onOk={() => curriculumForm.submit()}
              className="rounded-2xl"
              okText="Lưu lại"
              cancelText="Hủy"
            >
              <Form form={curriculumForm} layout="vertical" onFinish={handleCurriculumSubmit} className="pt-2">
                <Form.Item name="code" label="Mã giáo trình" rules={[{ required: !editingItem }]}>
                  <Input placeholder="Ví dụ: CURR_A1" disabled={!!editingItem} className="rounded-xl font-mono" />
                </Form.Item>
                <Form.Item name="title" label="Tiêu đề giáo trình" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: Tiếng Anh nâng cao lớp 6" className="rounded-xl" />
                </Form.Item>
                <Form.Item name="levelId" label="Level (Độ tuổi / Cấp độ)">
                  <Select className="rounded-xl" placeholder="Chọn level" allowClear>
                    {levels.map((l) => (
                      <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="description" label="Mô tả giáo trình">
                  <Input.TextArea placeholder="Mô tả giáo trình..." rows={3} className="rounded-xl" />
                </Form.Item>
                {!editingItem && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700">
                    💡 Giáo trình sẽ được tạo ở trạng thái <strong>Nháp</strong>. Sau khi thêm đề thi (đã phát hành), bạn có thể Phát hành giáo trình.
                  </div>
                )}
              </Form>
            </Modal>

            {/* MANAGE QUESTIONS IN EXAM MODAL */}
            <Modal
              title={
                <div>
                  <div className="font-bold text-slate-800">Cấu hình câu hỏi cho đề thi</div>
                  <div className="text-sm text-slate-400 font-normal mt-0.5">{selectedExam?.title}</div>
                </div>
              }
              open={manageQuestionsOpen}
              onCancel={() => {
                setManageQuestionsOpen(false);
                setSelectedExam(null);
              }}
              width={1000}
              footer={
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-400">
                    ⚠️ Chỉ câu hỏi đã được <strong>Duyệt (published)</strong> mới có thể thêm vào đề thi
                  </div>
                  <Button type="primary" onClick={() => { setManageQuestionsOpen(false); setSelectedExam(null); }}>
                    Hoàn tất
                  </Button>
                </div>
              }
              className="rounded-2xl"
            >
              <Row gutter={24} className="pt-2">
                {/* Left column: Current exam questions */}
                <Col span={12}>
                  <Card
                    title={
                      <div className="flex items-center justify-between">
                        <span>Câu hỏi trong đề thi</span>
                        <Badge count={selectedExam?.questions?.length || 0} color="indigo" />
                      </div>
                    }
                    className="rounded-2xl border-slate-100 shadow-sm"
                    size="small"
                  >
                    <List
                      dataSource={selectedExam?.questions || []}
                      renderItem={(eq: any, index: number) => {
                        const q = questions.find((q) => q.id === eq.questionId);
                        return (
                          <List.Item
                            actions={[
                              <Button
                                type="text"
                                size="small"
                                disabled={index === 0}
                                icon={<ArrowUpOutlined />}
                                onClick={() => handleReorderExamQuestions(index, "up")}
                              />,
                              <Button
                                type="text"
                                size="small"
                                disabled={index === (selectedExam?.questions || []).length - 1}
                                icon={<ArrowDownOutlined />}
                                onClick={() => handleReorderExamQuestions(index, "down")}
                              />,
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveQuestionFromExam(eq.questionId)}
                              />,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                  {index + 1}
                                </div>
                              }
                              title={
                                <div className="text-xs font-semibold line-clamp-1">
                                  {q?.prompt || "(Câu hỏi không tìm thấy)"}
                                </div>
                              }
                              description={
                                <div className="flex gap-2">
                                  <span className="text-[10px] text-slate-400">Điểm: {eq.score}</span>
                                  {q && <Tag color={QUESTION_TYPE_COLORS[q.type]} className="text-[9px] border-none">{QUESTION_TYPE_LABELS[q.type]}</Tag>}
                                </div>
                              }
                            />
                          </List.Item>
                        );
                      }}
                      locale={{ emptyText: <Empty description="Đề thi chưa có câu hỏi nào" imageStyle={{ height: 40 }} /> }}
                    />
                  </Card>
                </Col>

                {/* Right column: Available published questions */}
                <Col span={12}>
                  <Card
                    title={
                      <div className="flex items-center justify-between">
                        <span>Ngân hàng câu hỏi (đã duyệt)</span>
                        <Badge
                          count={questions.filter((q) => q.status === "published" && !(selectedExam?.questions || []).some((eq: any) => eq.questionId === q.id)).length}
                          color="green"
                        />
                      </div>
                    }
                    className="rounded-2xl border-slate-100 shadow-sm"
                    size="small"
                  >
                    <List
                      dataSource={questions.filter(
                        (q) =>
                          q.status === "published" &&
                          !(selectedExam?.questions || []).some((eq: any) => eq.questionId === q.id),
                      )}
                      renderItem={(q: any) => (
                        <List.Item
                          actions={[
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleAddQuestionToExam(q.id)}
                            >
                              Thêm
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={<div className="text-xs font-semibold line-clamp-1">{q.prompt}</div>}
                            description={
                              <Tag color={QUESTION_TYPE_COLORS[q.type]} className="text-[9px] border-none">
                                {QUESTION_TYPE_LABELS[q.type]}
                              </Tag>
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: <Empty description="Không có câu hỏi đã duyệt" imageStyle={{ height: 40 }} /> }}
                    />
                  </Card>
                </Col>
              </Row>
            </Modal>

            {/* MANAGE EXAMS IN CURRICULUM MODAL */}
            <Modal
              title={
                <div>
                  <div className="font-bold text-slate-800">Cấu hình đề thi cho giáo trình</div>
                  <div className="text-sm text-slate-400 font-normal mt-0.5">{selectedCurriculum?.title}</div>
                </div>
              }
              open={manageExamsOpen}
              onCancel={() => {
                setManageExamsOpen(false);
                setSelectedCurriculum(null);
              }}
              width={1000}
              footer={
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-400">
                    ⚠️ Chỉ đề thi đang <strong>Phát hành (published)</strong> mới có thể thêm vào giáo trình
                  </div>
                  <Button type="primary" onClick={() => { setManageExamsOpen(false); setSelectedCurriculum(null); }}>
                    Hoàn tất
                  </Button>
                </div>
              }
              className="rounded-2xl"
            >
              <Row gutter={24} className="pt-2">
                {/* Left column: Current curriculum exams */}
                <Col span={12}>
                  <Card
                    title={
                      <div className="flex items-center justify-between">
                        <span>Đề thi trong giáo trình</span>
                        <Badge count={selectedCurriculum?.exams?.length || 0} color="purple" />
                      </div>
                    }
                    className="rounded-2xl border-slate-100 shadow-sm"
                    size="small"
                  >
                    <List
                      dataSource={selectedCurriculum?.exams || []}
                      renderItem={(ce: any, index: number) => {
                        const e = exams.find((exam) => exam.id === ce.examId);
                        return (
                          <List.Item
                            actions={[
                              <Button
                                type="text"
                                size="small"
                                disabled={index === 0}
                                icon={<ArrowUpOutlined />}
                                onClick={() => handleReorderCurriculumExams(index, "up")}
                              />,
                              <Button
                                type="text"
                                size="small"
                                disabled={index === (selectedCurriculum?.exams || []).length - 1}
                                icon={<ArrowDownOutlined />}
                                onClick={() => handleReorderCurriculumExams(index, "down")}
                              />,
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveExamFromCurriculum(ce.examId)}
                              />,
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">
                                  {index + 1}
                                </div>
                              }
                              title={<div className="text-xs font-semibold line-clamp-1">{e?.title || "(Đề thi không tìm thấy)"}</div>}
                              description={
                                <div className="flex gap-2">
                                  <Tag color={ce.isRequired ? "red" : "default"} className="text-[9px] border-none">
                                    {ce.isRequired ? "Bắt buộc" : "Tuỳ chọn"}
                                  </Tag>
                                  {e && <span className="text-[10px] text-slate-400">{e.questions?.length || 0} câu</span>}
                                </div>
                              }
                            />
                          </List.Item>
                        );
                      }}
                      locale={{ emptyText: <Empty description="Giáo trình chưa có đề thi nào" imageStyle={{ height: 40 }} /> }}
                    />
                  </Card>
                </Col>

                {/* Right column: Available published exams */}
                <Col span={12}>
                  <Card
                    title={
                      <div className="flex items-center justify-between">
                        <span>Đề thi khả dụng (đã phát hành)</span>
                        <Badge
                          count={exams.filter((e) => e.status === "published" && !(selectedCurriculum?.exams || []).some((ce: any) => ce.examId === e.id)).length}
                          color="green"
                        />
                      </div>
                    }
                    className="rounded-2xl border-slate-100 shadow-sm"
                    size="small"
                  >
                    <List
                      dataSource={exams.filter(
                        (e) =>
                          e.status === "published" &&
                          !(selectedCurriculum?.exams || []).some((ce: any) => ce.examId === e.id),
                      )}
                      renderItem={(e: any) => (
                        <List.Item
                          actions={[
                            <Button
                              type="dashed"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => handleAddExamToCurriculum(e.id)}
                            >
                              Thêm
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={<div className="text-xs font-semibold line-clamp-1">{e.title}</div>}
                            description={
                              <span className="text-[10px] text-slate-400">
                                {e.questions?.length || 0} câu • ⏱ {e.timeLimitSeconds ? Math.round(e.timeLimitSeconds / 60) + " phút" : "Không giới hạn"}
                              </span>
                            }
                          />
                        </List.Item>
                      )}
                      locale={{ emptyText: <Empty description="Không có đề thi đã phát hành" imageStyle={{ height: 40 }} /> }}
                    />
                  </Card>
                </Col>
              </Row>
            </Modal>
          </div>
        </Spin>
      </div>
    </ConfigProvider>
  );
}

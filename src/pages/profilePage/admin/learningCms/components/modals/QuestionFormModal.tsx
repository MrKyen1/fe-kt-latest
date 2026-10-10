import { ServerSelect } from "../../../../../../components/ServerSelect";
import { useAuth } from "../../../../../../contexts/AuthContext";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  type FormInstance,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
  Segmented,
  Tag,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SoundOutlined,
  UploadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
import { AppImage } from "../../../../../../components/AppImagePreview";
import { SafeSelect } from "../../../../../../components/SafeSelect";
import { learningCmsService } from "../../../../../../services/learningCmsService";
import { CHOICE_TYPES, QUESTION_TYPES } from "../../constants";
import { MediaPickerInput } from "../MediaPickerInput";
import {
  Settings,
  FolderOpen,
  Image as LucideImage,
  Volume2,
  Video,
  ArrowLeftRight,
  Scissors,
  Eye,
  Sparkles,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface TaxItem { id: string; name: string; }
interface MediaItem { id: string; url: string; altText?: string; type?: string; mimeType?: string; }
interface Passage { id: string; title: string; }

interface MediaRole { value: string; label: string; }

interface Props {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  onFinish: (values: any) => Promise<void> | void;

  isEditing: boolean;
  isDuplicating?: boolean;

  currentType: string;
  onTypeChange: (val: string) => void;

  levels: TaxItem[];
  skills: TaxItem[];
  topics: TaxItem[];
  tags: TaxItem[];
  passages: Passage[];

  /** All media assets, pre-filtered by type where required */
  filteredMedia: MediaItem[];
  allMedia?: MediaItem[];
  availableRoles: MediaRole[];

  onPreviewAsset: (asset: MediaItem) => void;
  onUploadMedia?: (file: File, altText?: string) => Promise<MediaItem>;
}

// ── Question-type–specific detail fields ─────────────────────

function ChoiceFields({
  type,
  passages,
  allMedia = [],
  form,
}: {
  type: string;
  passages: Passage[];
  allMedia?: MediaItem[];
  form: FormInstance;
}) {
  const isTrueFalse = type === "true_false";
  const isAudioImageChoice = type === "audio_image_choice";
  const imageAssets = allMedia.filter(
    (m) => m.type === "image" || m.mimeType?.startsWith("image")
  );

  const handleSelectSingleCorrect = (selectedIdx: number) => {
    const currentOptions = form.getFieldValue("options") || [];
    const updated = currentOptions.map((opt: any, i: number) => ({
      ...opt,
      isCorrect: i === selectedIdx,
    }));
    form.setFieldsValue({ options: updated });
  };

  return (
    <>
      {type === "reading_comprehension" && (
        <Form.Item name="passageId" label="Bài đọc liên quan" rules={[{ required: true, message: "Vui lòng chọn bài đọc liên quan!" }]}>
          <ServerSelect endpoint="/learning/reading-passages" options={passages.map(item => ({ value: item.id, label: item.title }))} placeholder="Chọn bài đọc..." className="rounded-xl" />
        </Form.Item>
      )}
      <Form.List name="options">
        {(fields, { add, remove }) => (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-700">
                {isTrueFalse ? "Lựa chọn Đúng / Sai" : "Phương án trả lời"}
              </span>
              {!isTrueFalse && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => add({ content: "", isCorrect: false, mediaId: undefined })}
                >
                  Thêm đáp án
                </Button>
              )}
            </div>
            {fields.map(({ key, name, ...restField }, idx) => {
              const currentMediaId = form.getFieldValue(["options", name, "mediaId"]);
              const selectedImg = imageAssets.find((m) => m.id === currentMediaId);

              return (
                <div key={key} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 flex-shrink-0 mt-1">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Form.Item
                        {...restField}
                        name={[name, "content"]}
                        rules={
                          isAudioImageChoice
                            ? []
                            : [{ required: true, message: "Vui lòng nhập nội dung đáp án!" }]
                        }
                        className="mb-0"
                      >
                        <Input
                          placeholder={
                            isAudioImageChoice
                              ? "Chú thích / Tên đáp án (tùy chọn)"
                              : isTrueFalse
                                ? (idx === 0 ? "Đúng" : "Sai")
                                : "Nội dung đáp án"
                          }
                          className="rounded-lg"
                        />
                      </Form.Item>

                      {isAudioImageChoice && (
                        <div className="pt-1">
                          <Form.Item
                            {...restField}
                            name={[name, "mediaVal"]}
                            rules={[
                              {
                                validator: (_, val) => {
                                  const existingId = form.getFieldValue(["options", name, "mediaId"]);
                                  if (!val && !existingId) {
                                    return Promise.reject(new Error("Chọn hoặc tải ảnh cho đáp án này!"));
                                  }
                                  if (val && !val.mediaId && !val.file && !existingId) {
                                    return Promise.reject(new Error("Chọn hoặc tải ảnh cho đáp án này!"));
                                  }
                                  return Promise.resolve();
                                },
                              },
                            ]}
                            className="mb-0"
                          >
                            <MediaPickerInput
                              acceptType="image"
                              allMedia={imageAssets}
                              placeholder="Chọn ảnh từ thư viện hoặc tải ảnh từ máy..."
                            />
                          </Form.Item>
                        </div>
                      )}

                      {!isTrueFalse && (
                        <Form.Item {...restField} name={[name, "explanation"]} className="mb-0">
                          <Input placeholder="Giải thích đáp án này (tuỳ chọn)" className="rounded-lg text-xs" size="small" />
                        </Form.Item>
                      )}
                    </div>

                    <Form.Item
                      {...restField}
                      name={[name, "isCorrect"]}
                      valuePropName="checked"
                      className="mb-0 mt-1 shrink-0"
                    >
                      <Checkbox
                        className="text-emerald-600 font-semibold"
                        onChange={(e) => {
                          if (isTrueFalse && e.target.checked) {
                            handleSelectSingleCorrect(idx);
                          }
                        }}
                      >
                        Đúng
                      </Checkbox>
                    </Form.Item>

                    {!isTrueFalse && fields.length > 2 && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Form.List>
    </>
  );
}

function WordOrderingFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình sắp xếp từ
      </span>
      <Form.Item name="correctTokens" label="Các từ theo thứ tự đúng (cách nhau bởi dấu cách)" rules={[{ required: true, message: "Vui lòng nhập thứ tự từ đúng!" }]}>
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

function SentenceRewriteFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình viết câu / viết lại câu
      </span>
      <Form.Item name="acceptedAnswers" label="Đáp án chấp nhận (mỗi dòng một đáp án)" rules={[{ required: true, message: "Vui lòng nhập đáp án chấp nhận!" }]}>
        <Input.TextArea placeholder={"It is not warm enough to swim.\nSwimming is impossible due to the cold."} rows={3} className="rounded-xl font-mono" />
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

function HintRewriteFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình viết câu có gợi ý
      </span>
      <Form.Item name="hintWord" label="Từ gợi ý (hint word)" rules={[{ required: true, message: "Vui lòng nhập từ gợi ý!" }]}>
        <Input placeholder="Ví dụ: since" className="rounded-xl font-mono" />
      </Form.Item>
      <Form.Item name="acceptedAnswers" label="Đáp án chấp nhận (mỗi dòng một đáp án)" rules={[{ required: true, message: "Vui lòng nhập đáp án chấp nhận!" }]}>
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

function ErrorCorrectionFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình sửa lỗi
      </span>
      <Form.Item name="correctSentence" label="Đáp án" rules={[{ required: true, message: "Vui lòng nhập đáp án sửa đúng!" }]}>
        <Input.TextArea placeholder="Câu đã sửa đúng..." rows={2} className="rounded-xl" />
      </Form.Item>
    </div>
  );
}

function AudioFillBlanksFields({ form }: { form: FormInstance }) {
  const textareaRef = useRef<any>(null);
  const [passageText, setPassageText] = useState<string>(() => form.getFieldValue("passageText") || "");

  // Sync state if form value initialized/changed externally (e.g. edit mode)
  useEffect(() => {
    const val = form.getFieldValue("passageText") || "";
    setPassageText(val);
  }, [form]);

  const syncBlanksFromText = (text: string, overrideAnswer?: { id: string; answer: string }) => {
    setPassageText(text);
    const matches = Array.from(text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g));
    const tokenIds: string[] = [];
    matches.forEach((m) => {
      const id = m[1];
      if (id && !tokenIds.includes(id)) {
        tokenIds.push(id);
      }
    });

    const currentBlanks: Array<{ id: string; acceptedAnswers: string }> =
      form.getFieldValue("blanks") || [];

    const existingMap = new Map<string, string>();
    currentBlanks.forEach((b) => {
      if (b && b.id) {
        existingMap.set(
          b.id,
          typeof b.acceptedAnswers === "string"
            ? b.acceptedAnswers
            : Array.isArray(b.acceptedAnswers)
              ? (b.acceptedAnswers as string[]).join(", ")
              : ""
        );
      }
    });

    if (overrideAnswer) {
      existingMap.set(overrideAnswer.id, overrideAnswer.answer);
    }

    const newBlanks = tokenIds.map((id) => ({
      id,
      acceptedAnswers: existingMap.get(id) || "",
    }));

    form.setFieldsValue({ blanks: newBlanks });
  };

  const getNextBlankId = (text: string): string => {
    const matches = Array.from(text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g));
    const existingIds = new Set(matches.map((m) => m[1]));
    let idx = 1;
    while (existingIds.has(`blank${idx}`)) {
      idx++;
    }
    return `blank${idx}`;
  };

  const handleInsertBlank = () => {
    const textareaEl = textareaRef.current?.resizableTextArea?.textArea as HTMLTextAreaElement | null;
    const currentPassage = form.getFieldValue("passageText") || "";
    const blankId = getNextBlankId(currentPassage);
    const token = `{{${blankId}}}`;

    if (textareaEl && textareaEl.selectionStart !== undefined && textareaEl.selectionEnd !== undefined) {
      const start = textareaEl.selectionStart;
      const end = textareaEl.selectionEnd;
      const newText = currentPassage.substring(0, start) + token + currentPassage.substring(end);
      form.setFieldsValue({ passageText: newText });
      syncBlanksFromText(newText);
      setTimeout(() => {
        textareaEl.focus();
        textareaEl.setSelectionRange(start + token.length, start + token.length);
      }, 0);
    } else {
      const newText = currentPassage ? `${currentPassage} ${token}` : token;
      form.setFieldsValue({ passageText: newText });
      syncBlanksFromText(newText);
    }
  };

  const handleConvertSelectionToBlank = () => {
    const textareaEl = textareaRef.current?.resizableTextArea?.textArea as HTMLTextAreaElement | null;
    const currentPassage = form.getFieldValue("passageText") || "";

    if (!textareaEl || textareaEl.selectionStart === undefined || textareaEl.selectionEnd === undefined) {
      message.info("Vui lòng bôi đen một từ hoặc cụm từ trong đoạn văn để chuyển thành ô trống!");
      return;
    }

    const start = textareaEl.selectionStart;
    const end = textareaEl.selectionEnd;
    const selectedText = currentPassage.substring(start, end).trim();

    if (!selectedText) {
      message.info("Vui lòng bôi đen một từ hoặc cụm từ trong đoạn văn để chuyển thành ô trống!");
      return;
    }

    const blankId = getNextBlankId(currentPassage);
    const token = `{{${blankId}}}`;
    const newText = currentPassage.substring(0, start) + token + currentPassage.substring(end);
    form.setFieldsValue({ passageText: newText });
    syncBlanksFromText(newText, { id: blankId, answer: selectedText });

    message.success(`Đã chuyển "${selectedText}" thành ô trống {{${blankId}}} với đáp án là "${selectedText}"!`);
    setTimeout(() => {
      textareaEl.focus();
      textareaEl.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Split passage text for live visual preview
  const previewParts = useMemo(() => {
    if (!passageText) return [];
    return passageText.split(/(\{\{[a-zA-Z0-9_]+\}\})/g);
  }, [passageText]);

  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Settings size={15} className="text-slate-500" /> Cấu hình bài nghe & điền từ vào đoạn văn
        </span>
        <Space size="small">
          <Button
            size="small"
            type="dashed"
            icon={<Scissors size={13} className="text-amber-600 inline mr-1" />}
            onClick={handleConvertSelectionToBlank}
            className="text-xs text-amber-700 border-amber-300 hover:border-amber-400 bg-amber-50/50 font-medium"
          >
            Chuyển từ đang bôi đen thành ô trống
          </Button>
          <Button
            size="small"
            type="dashed"
            icon={<PlusOutlined />}
            onClick={handleInsertBlank}
            className="text-xs text-indigo-600 border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 font-medium"
          >
            + Chèn ô trống {"{{blank...}}"}
          </Button>
        </Space>
      </div>

      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-800 leading-relaxed flex items-start gap-2">
        <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong>Cách soạn nhanh:</strong> Bạn có thể dán toàn bộ đoạn script tiếng Anh vào ô dưới, sau đó <strong>bôi đen từ cần ẩn</strong> và nhấn nút <strong>"Chuyển từ đang bôi đen thành ô trống"</strong>. Hệ thống sẽ tự động gán từ đó làm đáp án đúng!
        </div>
      </div>

      <Form.Item
        name="passageText"
        label="Đoạn văn bản bài nghe (Chứa các ô trống)"
        rules={[{ required: true, message: "Vui lòng nhập đoạn văn có chứa ô trống!" }]}
      >
        <Input.TextArea
          ref={textareaRef}
          rows={5}
          placeholder={"Ví dụ: I have studied English for {{blank1}} years. My favorite subject is {{blank2}} because it is very useful."}
          className="rounded-xl font-mono text-sm leading-relaxed"
          onChange={(e) => syncBlanksFromText(e.target.value)}
        />
      </Form.Item>

      {/* Visual Live Preview */}
      {previewParts.length > 0 && (
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Eye size={13} className="text-indigo-500" /> Xem trước hiển thị của học sinh:
          </div>
          <div className="text-sm text-slate-800 leading-loose">
            {previewParts.map((part, pIdx) => {
              const match = part.match(/^\{\{([a-zA-Z0-9_]+)\}\}$/);
              if (!match) return <span key={pIdx}>{part}</span>;
              const bId = match[1];
              return (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/80 text-indigo-700 font-semibold font-mono text-xs"
                >
                  <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 text-[10px] flex items-center justify-center font-bold">
                    {pIdx + 1}
                  </span>
                  <span>{bId}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="gradingMode"
            label="Chế độ chấm điểm"
            initialValue="normalized"
          >
            <Select className="rounded-xl">
              <Select.Option value="normalized">Normalized (Bỏ qua hoa thường & dấu cách thừa)</Select.Option>
              <Select.Option value="exact">Exact (Chính xác tuyệt đối)</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Divider className="my-2" />

      <div>
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
          Danh sách ô trống & Đáp án chấp nhận
        </div>
        <Form.List name="blanks">
          {(fields, { remove }) => (
            <div className="space-y-2.5">
              {fields.length === 0 && (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Chưa phát hiện ô trống nào trong đoạn văn. Bôi đen từ hoặc bấm nút <strong>Chèn ô trống</strong> phía trên.
                </div>
              )}
              {fields.map(({ key, name, ...restField }, idx) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="w-32 shrink-0">
                    <Form.Item
                      {...restField}
                      name={[name, "id"]}
                      className="mb-0"
                      rules={[{ required: true, message: "Mã trống!" }]}
                    >
                      <Input
                        prefix={<span className="text-indigo-400 font-mono text-xs">{"{{"}</span>}
                        suffix={<span className="text-indigo-400 font-mono text-xs">{"}}"}</span>}
                        placeholder="blank1"
                        className="rounded-lg font-mono font-bold text-center text-indigo-700 bg-indigo-50/50 text-xs"
                      />
                    </Form.Item>
                  </div>
                  <div className="flex-1">
                    <Form.Item
                      {...restField}
                      name={[name, "acceptedAnswers"]}
                      className="mb-0"
                      rules={[{ required: true, message: "Vui lòng nhập ít nhất một đáp án đúng!" }]}
                    >
                      <Input
                        placeholder="Nhập các đáp án đúng, cách nhau bởi dấu phẩy (VD: school, the school)"
                        className="rounded-lg text-xs"
                      />
                    </Form.Item>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </div>
    </div>
  );
}

function MatchingPairRow({
  name,
  restField,
  remove,
  form,
  allMedia = [],
  index,
}: {
  name: number;
  restField: any;
  remove: (index: number) => void;
  form: FormInstance;
  allMedia?: MediaItem[];
  index: number;
}) {
  const initialLeftMediaId = form.getFieldValue(["pairs", name, "leftMediaId"]);
  const initialLeftMediaVal = form.getFieldValue(["pairs", name, "leftMediaVal"]);
  const [leftType, setLeftType] = useState<"text" | "media">(
    initialLeftMediaId || initialLeftMediaVal?.mediaId || initialLeftMediaVal?.file ? "media" : "text"
  );

  useEffect(() => {
    const mId = form.getFieldValue(["pairs", name, "leftMediaId"]);
    const mVal = form.getFieldValue(["pairs", name, "leftMediaVal"]);
    if (mId || mVal?.mediaId || mVal?.file) {
      setLeftType("media");
    }
  }, [name, form]);

  return (
    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-slate-700">Cặp ghép đôi {index + 1}</span>
        </div>
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => remove(name)}
          className="text-slate-400 hover:text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* Left Side (Vế trái) */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700">Vế trái (Cột A)</span>
            <Segmented
              size="small"
              value={leftType}
              onChange={(val) => {
                setLeftType(val as "text" | "media");
                if (val === "text") {
                  form.setFieldValue(["pairs", name, "leftMediaVal"], undefined);
                  form.setFieldValue(["pairs", name, "leftMediaId"], undefined);
                }
              }}
              options={[
                { label: "Văn bản", value: "text" },
                { label: "Ảnh / Âm thanh", value: "media" },
              ]}
              className="text-[11px] p-0.5"
            />
          </div>

          {leftType === "text" ? (
            <Form.Item
              {...restField}
              name={[name, "leftText"]}
              rules={[{ required: true, message: "Nhập nội dung vế trái!" }]}
              className="mb-0"
            >
              <Input placeholder="Nhập văn bản vế trái (Ví dụ: Con mèo)" className="rounded-lg text-sm" />
            </Form.Item>
          ) : (
            <div className="space-y-1.5">
              <Form.Item
                {...restField}
                name={[name, "leftMediaVal"]}
                rules={[
                  {
                    validator: (_, val) => {
                      const existingId = form.getFieldValue(["pairs", name, "leftMediaId"]);
                      if (!val && !existingId) {
                        return Promise.reject(new Error("Chọn hoặc tải tệp media cho vế trái!"));
                      }
                      if (val && !val.mediaId && !val.file && !existingId) {
                        return Promise.reject(new Error("Chọn hoặc tải tệp media cho vế trái!"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                className="mb-0"
              >
                <MediaPickerInput
                  acceptType="all"
                  allMedia={allMedia}
                  placeholder="Chọn ảnh hoặc audio từ thư viện / tải từ máy..."
                />
              </Form.Item>
              <Form.Item {...restField} name={[name, "leftText"]} className="mb-0">
                <Input placeholder="Chú thích chữ kèm theo (tùy chọn)" className="rounded-lg text-xs" />
              </Form.Item>
            </div>
          )}
        </div>

        {/* Right Side (Vế phải) */}
        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Vế phải (Cột B)</span>
            <span className="text-[11px] text-slate-400">Đáp án ghép nối</span>
          </div>

          <Form.Item
            {...restField}
            name={[name, "rightText"]}
            rules={[{ required: true, message: "Nhập nội dung vế phải!" }]}
            className="mb-0"
          >
            <Input placeholder="Nhập văn bản vế phải (Ví dụ: Cat)" className="rounded-lg text-sm" />
          </Form.Item>
        </div>
      </div>
    </div>
  );
}

function MatchingFields({ allMedia = [], form }: { allMedia?: MediaItem[]; form: FormInstance }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình ghép đôi (Matching)
      </span>
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
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">Các cặp ghép đôi ({fields.length})</span>
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => add({ leftText: "", rightText: "", leftMediaId: undefined })}
              >
                Thêm cặp ghép đôi
              </Button>
            </div>
            {fields.map(({ key, name, ...restField }, index) => (
              <MatchingPairRow
                key={key}
                name={name}
                restField={restField}
                remove={remove}
                form={form}
                allMedia={allMedia}
                index={index}
              />
            ))}
          </div>
        )}
      </Form.List>
    </div>
  );
}

/** Renders the type-specific detail section inside the form. */
function QuestionDetailFields({
  type,
  passages,
  allMedia,
  form,
}: {
  type: string;
  passages: Passage[];
  allMedia?: MediaItem[];
  form: FormInstance;
}) {
  if (CHOICE_TYPES.includes(type))
    return (
      <ChoiceFields
        type={type}
        passages={passages}
        allMedia={allMedia}
        form={form}
      />
    );
  if (type === "word_ordering") return <WordOrderingFields />;
  if (type === "sentence_rewrite") return <SentenceRewriteFields />;
  if (type === "hint_rewrite") return <HintRewriteFields />;
  if (type === "error_correction") return <ErrorCorrectionFields />;
  if (type === "audio_fill_blanks") return <AudioFillBlanksFields form={form} />;
  if (type === "matching") return <MatchingFields allMedia={allMedia} form={form} />;
  return null;
}

// ── Error extractor helper ────────────────────────────────────

function extractErrorMsg(error: any, fallback = "Thao tác thất bại"): string {
  const backendMsg = error?.response?.data?.message ?? error?.message;
  if (Array.isArray(backendMsg)) return backendMsg.join(", ");
  if (typeof backendMsg === "string" && backendMsg.trim()) return backendMsg;
  return fallback;
}

// ── Media section & Item component ────────────────────────────

interface MediaItemRowProps {
  form: FormInstance;
  name: number;
  restField: any;
  index: number;
  remove: (index: number) => void;
  filteredMedia: MediaItem[];
  availableRoles: MediaRole[];
  onPreviewAsset: (a: MediaItem) => void;
  currentType: string;
  onRegisterObjectUrl: (url: string) => void;
}

function MediaItemRow({
  form,
  name,
  restField,
  index,
  remove,
  filteredMedia: seedMedia,
  availableRoles,
  onPreviewAsset,
  currentType,
  onRegisterObjectUrl,
}: MediaItemRowProps) {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission("learning.media.upload");
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>(seedMedia);
  const initialRow = form.getFieldValue(["mediaIds", name]);

  const [itemState, setItemState] = useState<{
    mediaId?: string;
    file?: File;
    previewUrl?: string;
    fileName?: string;
    fileType?: string;
  }>({
    mediaId: initialRow?.mediaId,
    file: initialRow?.file,
    previewUrl: initialRow?.previewUrl,
    fileName: initialRow?.fileName,
    fileType: initialRow?.fileType,
  });

  const [mode, setMode] = useState<"upload" | "library">("upload");

  // Sync if form changes externally (e.g. edit mode initialization)
  useEffect(() => {
    const row = form.getFieldValue(["mediaIds", name]);
    setItemState({
      mediaId: row?.mediaId,
      file: row?.file,
      previewUrl: row?.previewUrl,
      fileName: row?.fileName,
      fileType: row?.fileType,
    });
  }, [name, form]);

  const currentMediaId = itemState.mediaId;
  const currentFile = itemState.file;
  const currentPreviewUrl = itemState.previewUrl;
  const currentFileName = itemState.fileName;
  const currentFileType = itemState.fileType;

  const hasItem = Boolean(currentFile || currentMediaId);

  const selectedAsset = currentMediaId ? filteredMedia.find((m) => m.id === currentMediaId) : undefined;

  const isImg = currentFile
    ? currentFileType === "image"
    : selectedAsset?.type === "image" || selectedAsset?.mimeType?.startsWith("image");

  const isAud = currentFile
    ? currentFileType === "audio"
    : selectedAsset?.type === "audio" || selectedAsset?.mimeType?.startsWith("audio");

  const isVid = currentFile
    ? currentFileType === "video"
    : selectedAsset?.type === "video" || selectedAsset?.mimeType?.startsWith("video");

  const previewSrc = currentFile && currentPreviewUrl
    ? currentPreviewUrl
    : selectedAsset?.url || "";

  const displayName = currentFile
    ? (currentFileName || currentFile.name)
    : (selectedAsset?.altText ?? selectedAsset?.url?.split("/").pop() ?? `Tệp #${currentMediaId}`);

  const handleClearItem = () => {
    if (currentPreviewUrl) {
      try { URL.revokeObjectURL(currentPreviewUrl); } catch (_) { }
    }
    form.setFieldValue(["mediaIds", name, "file"], undefined);
    form.setFieldValue(["mediaIds", name, "previewUrl"], undefined);
    form.setFieldValue(["mediaIds", name, "fileName"], undefined);
    form.setFieldValue(["mediaIds", name, "fileType"], undefined);
    form.setFieldValue(["mediaIds", name, "mediaId"], undefined);

    setItemState({});
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-2xl p-3.5 hover:border-indigo-200 transition-all duration-200 shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0 w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
            #{index + 1}
          </div>

          {!hasItem ? (
            <Segmented
              size="small"
              value={mode}
              onChange={(val) => setMode(val as "upload" | "library")}
              className="bg-slate-100 p-0.5 text-xs"
              options={[
                {
                  label: (
                    <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs">
                      <UploadOutlined />
                      <span>Tải lên từ máy</span>
                    </div>
                  ),
                  value: "upload",
                  disabled: !canUpload,
                },
                {
                  label: (
                    <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs">
                      <FolderOpen size={13} />
                      <span>Chọn từ thư viện ({filteredMedia.length})</span>
                    </div>
                  ),
                  value: "library",
                },
              ]}
            />
          ) : (
            <div className="flex items-center gap-1.5 truncate flex-wrap">
              {currentFile ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <UploadOutlined className="text-[11px]" /> Tệp tải lên
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <FolderOpen size={11} /> Thư viện Media
                </span>
              )}

              {isImg && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <LucideImage size={11} /> Hình ảnh
                </span>
              )}
              {isAud && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  <Volume2 size={11} /> Âm thanh
                </span>
              )}
              {isVid && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <Video size={11} /> Video
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hidden Form Items to guarantee Ant Design registers mediaId and fileName */}
        <Form.Item {...restField} name={[name, "mediaId"]} noStyle hidden>
          <Input />
        </Form.Item>
        <Form.Item {...restField} name={[name, "fileName"]} noStyle hidden>
          <Input />
        </Form.Item>

        {/* Role & Delete */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium leading-none">Vai trò:</span>
          <Form.Item
            {...restField}
            name={[name, "role"]}
            rules={[
              { required: true, message: "Chọn vai trò!" },
              {
                validator: async () => {
                  const rowVal = form.getFieldValue(["mediaIds", name]);
                  if (!rowVal?.mediaId && !rowVal?.file) {
                    return Promise.reject(new Error("Vui lòng tải lên tệp hoặc chọn từ thư viện!"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            noStyle
          >
            <Select placeholder="Chọn vai trò" size="small" className="w-44 text-xs">
              {availableRoles.map((r) => (
                <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Tooltip title="Xoá tệp này">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined className="text-sm" />}
              onClick={() => {
                handleClearItem();
                remove(name);
              }}
              className="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500 hover:text-rose-600 transition-colors p-0"
            />
          </Tooltip>
        </div>
      </div>

      {/* When Empty: Selector controls */}
      {!hasItem && (
        mode === "upload" ? (
          <Upload.Dragger
            disabled={!canUpload}
            showUploadList={false}
            accept={
              currentType === "audio_choice" || currentType === "audio_image_choice"
                ? "audio/*,.mp3,.wav,.m4a,.ogg,.aac"
                : currentType === "image_choice"
                  ? "image/*,.png,.jpg,.jpeg,.webp,.svg"
                  : "audio/*,image/*,video/*"
            }
            beforeUpload={(file) => {
              if (
                (currentType === "audio_choice" || currentType === "audio_image_choice") &&
                !file.type.startsWith("audio/")
              ) {
                message.error("Câu hỏi dạng âm thanh chỉ chấp nhận tệp âm thanh (audio/*)!");
                return false;
              }
              if (currentType === "image_choice" && !file.type.startsWith("image/")) {
                message.error("Câu hỏi dạng hình ảnh chỉ chấp nhận tệp hình ảnh (image/*)!");
                return false;
              }
              if (file.size > 20 * 1024 * 1024) {
                message.error("Kích thước tệp không được vượt quá 20MB!");
                return false;
              }

              const previewUrl = URL.createObjectURL(file);
              onRegisterObjectUrl(previewUrl);

              const fileType = file.type.startsWith("image/")
                ? "image"
                : file.type.startsWith("audio/")
                  ? "audio"
                  : "video";

              const defaultRole =
                availableRoles.length === 1
                  ? availableRoles[0].value
                  : currentType === "image_choice" || fileType === "image"
                    ? "prompt_image"
                    : currentType === "audio_choice" || currentType === "audio_image_choice" || currentType === "audio_fill_blanks" || fileType === "audio"
                      ? "prompt_audio"
                      : "prompt_image";

              form.setFieldValue(["mediaIds", name, "file"], file);
              form.setFieldValue(["mediaIds", name, "previewUrl"], previewUrl);
              form.setFieldValue(["mediaIds", name, "fileName"], file.name);
              form.setFieldValue(["mediaIds", name, "fileType"], fileType);
              form.setFieldValue(["mediaIds", name, "mediaId"], undefined);
              form.setFieldValue(["mediaIds", name, "role"], defaultRole);

              // Update local state -> triggers instant re-render!
              setItemState({
                file,
                previewUrl,
                fileName: file.name,
                fileType,
                mediaId: undefined,
              });

              message.success(`Đã chọn "${file.name}"! Tệp sẽ được tải lên khi bạn nhấn "Lưu lại".`);
              return false;
            }}
            className="bg-slate-50/70 hover:bg-indigo-50/20 border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-all p-3"
          >
            <div className="py-2 flex flex-col items-center justify-center gap-1 text-slate-500">
              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-0.5">
                <UploadOutlined className="text-base" />
              </div>
              <p className="text-xs font-semibold text-slate-700 m-0">
                Nhấp hoặc kéo thả tệp từ máy tính vào đây
              </p>
              <p className="text-[11px] text-slate-400 m-0">
                {currentType === "audio_choice" || currentType === "audio_fill_blanks"
                  ? "Hỗ trợ MP3, WAV, M4A, OGG (Tối đa 20MB) • Xem trước ngay"
                  : currentType === "image_choice"
                    ? "Hỗ trợ PNG, JPG, JPEG, WEBP, SVG (Tối đa 20MB) • Xem trước ngay"
                    : "Hỗ trợ Âm thanh, Hình ảnh hoặc Video (Tối đa 20MB) • Xem trước ngay"}
              </p>
            </div>
          </Upload.Dragger>
        ) : (
          <ServerSelect endpoint="/learning/media-assets" onRecords={rows => setFilteredMedia(previous => Array.from(new Map([...previous, ...rows].map(row => [row.id, row])).values()))} optionLabel={row => row.altText || row.originalName || row.url.split("/").pop()}
            showSearch
            placeholder="Tìm kiếm tệp theo tên hoặc mô tả trong thư viện..."
            className="w-full"
            allowClear
            size="middle"

            onChange={(val) => {
              form.setFieldValue(["mediaIds", name, "mediaId"], val);
              form.setFieldValue(["mediaIds", name, "file"], undefined);
              form.setFieldValue(["mediaIds", name, "previewUrl"], undefined);
              form.setFieldValue(["mediaIds", name, "fileName"], undefined);
              form.setFieldValue(["mediaIds", name, "fileType"], undefined);

              const chosen = filteredMedia.find((m) => m.id === val);
              if (chosen) {
                const isImageFile = chosen.type === "image" || chosen.mimeType?.startsWith("image");
                const defaultRole =
                  availableRoles.length === 1
                    ? availableRoles[0].value
                    : currentType === "image_choice" || isImageFile
                      ? "prompt_image"
                      : currentType === "audio_choice" || currentType === "audio_image_choice" || currentType === "audio_fill_blanks" || chosen.type === "audio"
                        ? "prompt_audio"
                        : "prompt_image";
                form.setFieldValue(["mediaIds", name, "role"], defaultRole);
              }

              // Update local state -> triggers instant re-render!
              setItemState({
                mediaId: val,
                file: undefined,
                previewUrl: undefined,
                fileName: undefined,
                fileType: undefined,
              });
            }}
          />
        )
      )}

      {/* When Has Item: Rich Preview Card */}
      {hasItem && (
        <div className="flex items-center gap-3.5 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
          {/* Thumbnail / Icon */}
          {isImg ? (
            <div className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center relative shadow-xs">
              <AppImage
                src={previewSrc}
                autoResolve={!currentFile}
                alt={displayName}
                className="w-16 h-16 object-cover"
                maskText="Xem ảnh"
              />
            </div>
          ) : isAud ? (
            <div className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 border border-violet-400/30 flex flex-col items-center justify-center text-white shadow-xs">
              <Volume2 size={24} className="text-white" />
              <span className="text-[9px] font-bold text-violet-100 uppercase tracking-wider mt-0.5">Audio</span>
            </div>
          ) : isVid ? (
            <div className="shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-400/30 flex flex-col items-center justify-center text-white shadow-xs">
              <Video size={24} className="text-white" />
              <span className="text-[9px] font-bold text-amber-100 uppercase tracking-wider mt-0.5">Video</span>
            </div>
          ) : (
            <div className="shrink-0 w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
              Media
            </div>
          )}

          {/* Details & Controls */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <div
                className="font-semibold text-sm text-slate-800 truncate"
                title={displayName}
              >
                {displayName}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowLeftRight size={12} />}
                  className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium px-2 py-0.5 h-auto rounded-md flex items-center gap-1"
                  onClick={handleClearItem}
                >
                  Đổi tệp
                </Button>

                {selectedAsset && !isImg && (
                  <Button
                    type="text"
                    size="small"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-0.5 h-auto rounded-md"
                    onClick={() => onPreviewAsset(selectedAsset)}
                  >
                    Chi tiết
                  </Button>
                )}
              </div>
            </div>

            {/* Note if local file */}
            {currentFile ? (
              <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700">{(currentFile.size / 1024 / 1024).toFixed(2)} MB</span>
                <span className="text-slate-300">•</span>
                <span className="text-indigo-600">Sẵn sàng tải lên khi bạn nhấn &quot;Lưu lại&quot;</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 mt-0.5">
                Tệp từ thư viện Media • ID: {currentMediaId}
              </div>
            )}

            {/* Inline Audio Player if audio */}
            {isAud && previewSrc && (
              <div className="mt-2.5">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                  src={currentFile ? previewSrc : resolveMediaUrl(previewSrc)}
                  controls
                  className="h-8 w-full max-w-lg rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MediaSection({
  form,
  filteredMedia,
  availableRoles,
  onPreviewAsset,
  currentType,
  onRegisterObjectUrl,
}: {
  form: FormInstance;
  filteredMedia: MediaItem[];
  availableRoles: MediaRole[];
  onPreviewAsset: (a: MediaItem) => void;
  currentType: string;
  onRegisterObjectUrl: (url: string) => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LucideImage size={15} />
          </div>
          <span className="text-sm font-semibold text-slate-700">Tệp tin đa phương tiện (Media)</span>
        </div>
      </div>

      {/* List */}
      <div className="p-3">
        <Form.List name="mediaIds">
          {(mediaFields, { add, remove }) => (
            <div className="space-y-3">
              {mediaFields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <FolderOpen size={36} className="text-slate-300 mb-2 stroke-[1.5]" />
                  <span className="text-xs">Chưa có tệp tin nào. Nhấn bên dưới để thêm.</span>
                </div>
              )}

              {mediaFields.map(({ key, name, ...restField }, index) => (
                <MediaItemRow
                  key={key}
                  form={form}
                  name={name}
                  restField={restField}
                  index={index}
                  remove={remove}
                  filteredMedia={filteredMedia}
                  availableRoles={availableRoles}
                  onPreviewAsset={onPreviewAsset}
                  currentType={currentType}
                  onRegisterObjectUrl={onRegisterObjectUrl}
                />
              ))}

              {/* Add button */}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => {
                  const defaultRole = availableRoles.length === 1 ? availableRoles[0].value : "prompt_image";
                  add({ mediaId: undefined, role: defaultRole });
                }}
                className="w-full rounded-xl h-9 text-slate-600 hover:text-indigo-600 hover:border-indigo-400 transition-all duration-200 font-medium text-xs flex items-center justify-center gap-1.5 bg-slate-50/50 hover:bg-indigo-50/30"
              >
                Thêm tệp đa phương tiện
              </Button>
            </div>
          )}
        </Form.List>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────

/**
 * Create / Edit Question modal.
 *
 * Contains the full Ant Design Form with:
 * - Question type and classification fields
 * - Prompt textarea
 * - Media attachments section (with Direct Upload & Library Select)
 * - Type-specific detail fields (choices, tokens, pairs, etc.)
 * - Explanation field
 *
 * All handlers (onFinish, onTypeChange) are passed from the parent.
 */
export default function QuestionFormModal({
  open,
  onCancel,
  form,
  onFinish,
  isEditing,
  isDuplicating = false,
  currentType,
  onTypeChange,
  levels,
  skills,
  topics,
  tags,
  passages,
  filteredMedia,
  allMedia,
  availableRoles,
  onPreviewAsset,
  onUploadMedia,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const resetScroll = () => {
        const modalBody = formTopRef.current?.closest(".ant-modal-body") as HTMLElement | null;
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      };
      resetScroll();
      const frame = requestAnimationFrame(resetScroll);
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  const handleRegisterObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
  };

  const cleanupObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (_) { }
    });
    objectUrlsRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, []);

  const handleModalCancel = () => {
    cleanupObjectUrls();
    onCancel();
  };

  const handleFinishFailed = (errorInfo: any) => {
    if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
      const firstError = errorInfo.errorFields[0];
      form.scrollToField(firstError.name, { behavior: "smooth", block: "center", focus: true });
    }
  };

  const handleFormFinish = async (values: any) => {
    try {
      setSubmitting(true);

      // Đọc trực tiếp từ Form store để giữ nguyên File cục bộ và mediaId (không bị AntD lọc mất)
      const formMediaList = form.getFieldValue("mediaIds");
      const rawMediaList = Array.isArray(formMediaList) && formMediaList.length > 0
        ? formMediaList
        : (values.mediaIds ?? []);

      const processedMediaIds: Array<{ mediaId: string; role: string; orderIndex: number }> = [];

      for (let i = 0; i < rawMediaList.length; i++) {
        const item = rawMediaList[i];
        if (!item) continue;

        const rowStore = form.getFieldValue(["mediaIds", i]) || {};
        const file: File | undefined = item.file || rowStore.file;
        const mediaId: string | undefined = item.mediaId || rowStore.mediaId;
        const fileName: string = item.fileName || rowStore.fileName || file?.name || "media-file";
        const role: string =
          item.role ||
          rowStore.role ||
          (currentType === "image_choice"
            ? "prompt_image"
            : currentType === "audio_choice" || currentType === "audio_image_choice" || currentType === "audio_fill_blanks"
              ? "prompt_audio"
              : "prompt_image");

        if (file) {
          // Chỉ khi người dùng nhấn "Lưu lại" (submit) mới tiến hành tải tệp lên server
          let uploaded: any = null;
          if (onUploadMedia) {
            uploaded = await onUploadMedia(file, fileName);
          } else {
            uploaded = await learningCmsService.mediaAssets.upload(file, fileName);
          }

          const uploadedId = uploaded?.id || uploaded?.data?.id;
          if (uploadedId) {
            processedMediaIds.push({
              mediaId: uploadedId,
              role,
              orderIndex: i,
            });
          } else {
            throw new Error(`Không thể tải lên tệp "${fileName}"!`);
          }
        } else if (mediaId) {
          processedMediaIds.push({
            mediaId,
            role,
            orderIndex: i,
          });
        }
      }

      // Đảm bảo loại câu hỏi hình ảnh / âm thanh luôn chuẩn hóa vai trò media
      if (currentType === "image_choice") {
        const hasPromptImg = processedMediaIds.some((m) => m.role === "prompt_image");
        if (!hasPromptImg) {
          if (processedMediaIds.length > 0) {
            processedMediaIds[0].role = "prompt_image";
          } else {
            throw new Error("Câu hỏi lựa chọn hình ảnh cần ít nhất một hình ảnh đề bài!");
          }
        }
      } else if (currentType === "audio_choice" || currentType === "audio_image_choice" || currentType === "audio_fill_blanks") {
        const hasPromptAud = processedMediaIds.some((m) => m.role === "prompt_audio");
        if (!hasPromptAud) {
          if (processedMediaIds.length > 0) {
            processedMediaIds[0].role = "prompt_audio";
          } else {
            throw new Error("Câu hỏi cần ít nhất một tệp âm thanh đề bài!");
          }
        }
      }

      // 1. Process options (audio_image_choice) mediaVal
      const rawOptions = values.options ?? [];
      const processedOptions = [];
      for (let i = 0; i < rawOptions.length; i++) {
        const opt = rawOptions[i];
        if (!opt) continue;
        let optMediaId = opt.mediaId;
        const mediaVal = opt.mediaVal || form.getFieldValue(["options", i, "mediaVal"]);
        if (mediaVal?.file) {
          const uploaded = onUploadMedia
            ? await onUploadMedia(mediaVal.file, mediaVal.fileName)
            : await learningCmsService.mediaAssets.upload(mediaVal.file, mediaVal.fileName);
          optMediaId = uploaded?.id || (uploaded as any)?.data?.id;
        } else if (mediaVal?.mediaId) {
          optMediaId = mediaVal.mediaId;
        }
        processedOptions.push({
          ...opt,
          mediaId: optMediaId,
        });
      }

      // 2. Process matching pairs mediaVal
      const rawPairs = values.pairs ?? [];
      const processedPairs = [];
      for (let i = 0; i < rawPairs.length; i++) {
        const pair = rawPairs[i];
        if (!pair) continue;
        let leftMediaId = pair.leftMediaId;
        const leftMediaVal = pair.leftMediaVal || form.getFieldValue(["pairs", i, "leftMediaVal"]);
        if (leftMediaVal?.file) {
          const uploaded = onUploadMedia
            ? await onUploadMedia(leftMediaVal.file, leftMediaVal.fileName)
            : await learningCmsService.mediaAssets.upload(leftMediaVal.file, leftMediaVal.fileName);
          leftMediaId = uploaded?.id || (uploaded as any)?.data?.id;
        } else if (leftMediaVal?.mediaId) {
          leftMediaId = leftMediaVal.mediaId;
        }

        processedPairs.push({
          ...pair,
          leftMediaId,
        });
      }

      await onFinish({
        ...values,
        options: processedOptions,
        pairs: processedPairs,
        mediaIds: processedMediaIds,
      });

      cleanupObjectUrls();
    } catch (err: any) {
      message.error(extractErrorMsg(err, "Không thể lưu câu hỏi!"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {isDuplicating ? (
            <CopyOutlined className="text-indigo-600" />
          ) : (
            <QuestionCircleOutlined className="text-indigo-600" />
          )}
          <span>
            {isDuplicating
              ? "Nhân bản câu hỏi"
              : isEditing
                ? "Cập nhật câu hỏi"
                : "Tạo câu hỏi mới"}
          </span>
          {isDuplicating && (
            <Tag color="purple" className="rounded-full text-[11px] font-medium border-0">
              Bản sao
            </Tag>
          )}
        </div>
      }
      open={open}
      forceRender
      maskClosable={false}
      onCancel={handleModalCancel}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={
        submitting
          ? "Đang lưu..."
          : isDuplicating
            ? "Tạo câu hỏi mới"
            : isEditing
              ? "Lưu lại"
              : "Tạo câu hỏi"
      }
      cancelButtonProps={{ disabled: submitting }}
      width={800}
      centered
      styles={{
        body: { maxHeight: "72vh", overflowY: "auto", overflowX: "hidden", paddingRight: "8px" },
      }}
      className="rounded-2xl"
      cancelText="Hủy"
    >
      <div ref={formTopRef} />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormFinish}
        onFinishFailed={handleFinishFailed}
        scrollToFirstError={{ behavior: "smooth", block: "center", focus: true }}
        className="pt-2"
      >
        {isDuplicating && (
          <div className="mb-3 px-3 py-2 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs text-indigo-700 flex items-center gap-2">
            <CopyOutlined className="text-indigo-500 shrink-0" />
            <span>Đã sao chép cấu trúc — chỉnh sửa nội dung và lưu câu hỏi mới.</span>
          </div>
        )}
        {/* Type & classification */}
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="type" label="Loại câu hỏi" rules={[{ required: true, message: "Vui lòng chọn loại câu hỏi!" }]}>
              <Select
                className="rounded-xl"
                disabled={isEditing}
                onChange={(val) => {
                  onTypeChange(val);
                  form.setFieldsValue({ options: [], pairs: [], correctTokens: "", acceptedAnswers: "", passageId: undefined });
                  if (CHOICE_TYPES.includes(val)) {
                    if (val === "true_false") {
                      form.setFieldsValue({
                        options: [
                          { label: "A", content: "Đúng", isCorrect: true },
                          { label: "B", content: "Sai", isCorrect: false },
                        ]
                      });
                    } else if (val === "audio_image_choice") {
                      form.setFieldsValue({
                        options: [
                          { label: "A", content: "", mediaId: undefined, isCorrect: true },
                          { label: "B", content: "", mediaId: undefined, isCorrect: false },
                          { label: "C", content: "", mediaId: undefined, isCorrect: false },
                          { label: "D", content: "", mediaId: undefined, isCorrect: false },
                        ]
                      });
                    } else {
                      form.setFieldsValue({
                        options: [
                          { label: "A", content: "", isCorrect: false },
                          { label: "B", content: "", isCorrect: false },
                          { label: "C", content: "", isCorrect: false },
                          { label: "D", content: "", isCorrect: false },
                        ]
                      });
                    }
                  } else if (val === "audio_fill_blanks") {
                    form.setFieldsValue({
                      passageText: "",
                      blanks: [
                        { id: "blank1", acceptedAnswers: "" }
                      ],
                      gradingMode: "normalized",
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
          <Col xs={24} md={12}>
            <Form.Item name="difficultyLevelId" label="Level độ khó">
              <ServerSelect endpoint="/learning/levels" options={levels.map(item => ({ value: item.id, label: item.name }))} className="rounded-xl" placeholder="Chọn level" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="skillId" label="Kỹ năng">
              <ServerSelect endpoint="/learning/skills" options={skills.map(item => ({ value: item.id, label: item.name }))} className="rounded-xl" placeholder="Chọn kỹ năng" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="topicId" label="Chủ đề">
              <ServerSelect endpoint="/learning/topics" options={topics.map(item => ({ value: item.id, label: item.name }))} className="rounded-xl" placeholder="Chọn chủ đề" allowClear />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="tagIds" label="Thẻ gắn">
          <ServerSelect endpoint="/learning/tags"
            mode="multiple"
            showSearch
            optionFilterProp="label"
            className="rounded-xl"
            placeholder="Chọn các thẻ..."
            allowClear
            options={tags.map((t) => ({ label: t.name, value: t.id }))}
          />
        </Form.Item>

        <Divider className="my-3" />

        {/* Prompt */}
        <Form.Item
          name="prompt"
          label={currentType === "error_correction" ? "Đề bài" : "Nội dung câu hỏi (Đề bài)"}
          rules={[{ required: true, message: "Vui lòng nhập nội dung câu hỏi (Đề bài)!" }]}
        >
          <Input.TextArea
            placeholder={
              currentType === "error_correction"
                ? "Ví dụ: She go to school by bus every day."
                : "Câu hỏi hiển thị cho học sinh..."
            }
            rows={3}
            className="rounded-xl"
          />
        </Form.Item>

        <Divider className="my-3" />

        {/* Media */}
        <MediaSection
          form={form}
          filteredMedia={filteredMedia}
          availableRoles={availableRoles}
          onPreviewAsset={onPreviewAsset}
          currentType={currentType}
          onRegisterObjectUrl={handleRegisterObjectUrl}
        />

        <Divider className="my-3" />

        {/* Type-specific fields */}
        <QuestionDetailFields
          type={currentType}
          passages={passages}
          allMedia={allMedia || filteredMedia}
          form={form}
        />

        <Divider className="my-3" />

        {/* Explanation */}
        <Form.Item name="explanation" label="Giải thích đáp án (Giải thích chi tiết)">
          <Input.TextArea
            placeholder="Nhập phần giải thích đáp án hiển thị sau khi học sinh nộp bài..."
            rows={3}
            className="rounded-xl"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}


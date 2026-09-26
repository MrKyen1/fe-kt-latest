import { useState, useRef, useEffect } from "react";
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
import { Settings, ArrowLeftRight, Image as LucideImage, FolderOpen, Video, Volume2 } from "lucide-react";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
import { AppImage } from "../../../../../../components/AppImagePreview";
import { learningCmsService } from "../../../../../../services/learningCmsService";
import { CHOICE_TYPES, QUESTION_TYPES } from "../../constants";

// ── Types ────────────────────────────────────────────────────

interface TaxItem   { id: string; name: string; }
interface MediaItem { id: string; url: string; altText?: string; type?: string; mimeType?: string; }
interface Passage   { id: string; title: string; }

interface MediaRole { value: string; label: string; }

interface Props {
  open:       boolean;
  onCancel:   () => void;
  form:       FormInstance;
  onFinish:   (values: any) => Promise<void> | void;

  isEditing:  boolean;
  isDuplicating?: boolean;

  currentType:   string;
  onTypeChange:  (val: string) => void;

  levels:   TaxItem[];
  skills:   TaxItem[];
  topics:   TaxItem[];
  tags:     TaxItem[];
  passages: Passage[];

  /** All media assets, pre-filtered by type where required */
  filteredMedia:    MediaItem[];
  availableRoles:   MediaRole[];

  onPreviewAsset: (asset: MediaItem) => void;
  onUploadMedia?: (file: File, altText?: string) => Promise<MediaItem>;
}

// ── Question-type–specific detail fields ─────────────────────

function ChoiceFields({ type, passages }: { type: string; passages: Passage[] }) {
  return (
    <>
      {type === "reading_comprehension" && (
        <Form.Item name="passageId" label="Bài đọc liên quan" rules={[{ required: true, message: "Vui lòng chọn bài đọc liên quan!" }]}>
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
              <span className="text-sm font-semibold text-slate-700">Phương án trả lời</span>
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
                  <Form.Item {...restField} name={[name, "content"]} rules={[{ required: true, message: "Vui lòng nhập nội dung đáp án!" }]} className="mb-1">
                    <Input placeholder="Nội dung đáp án" className="rounded-lg" />
                  </Form.Item>
                  <Form.Item {...restField} name={[name, "explanation"]} className="mb-0">
                    <Input placeholder="Giải thích đáp án này (tuỳ chọn)" className="rounded-lg text-xs" size="small" />
                  </Form.Item>
                </div>
                <Form.Item {...restField} name={[name, "isCorrect"]} valuePropName="checked" className="mb-0 mt-1">
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
        <Settings size={15} className="text-slate-500" /> Cấu hình viết lại câu
      </span>
      <Form.Item name="sourceSentence" label="Câu nguồn" rules={[{ required: true, message: "Vui lòng nhập câu gốc!" }]}>
        <Input.TextArea placeholder="Câu gốc để học sinh viết lại..." rows={2} className="rounded-xl" />
      </Form.Item>
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
        <Settings size={15} className="text-slate-500" /> Cấu hình viết lại có gợi ý
      </span>
      <Form.Item name="sourceSentence" label="Câu nguồn" rules={[{ required: true, message: "Vui lòng nhập câu gốc!" }]}>
        <Input.TextArea placeholder="Câu gốc..." rows={2} className="rounded-xl" />
      </Form.Item>
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

function MatchingFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        <Settings size={15} className="text-slate-500" /> Cấu hình ghép đôi
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">Các cặp ghép đôi</span>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ leftText: "", rightText: "" })}>
                Thêm cặp
              </Button>
            </div>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: "flex" }} align="baseline">
                <Form.Item {...restField} name={[name, "leftText"]} rules={[{ required: true, message: "Vui lòng nhập vế trái!" }]}>
                  <Input placeholder="Cột trái" className="rounded-lg w-36" />
                </Form.Item>
                <ArrowLeftRight size={14} className="text-slate-400" />
                <Form.Item {...restField} name={[name, "rightText"]} rules={[{ required: true, message: "Vui lòng nhập vế phải!" }]}>
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

/** Renders the type-specific detail section inside the form. */
function QuestionDetailFields({ type, passages }: { type: string; passages: Passage[] }) {
  if (CHOICE_TYPES.includes(type)) return <ChoiceFields type={type} passages={passages} />;
  if (type === "word_ordering")   return <WordOrderingFields />;
  if (type === "sentence_rewrite") return <SentenceRewriteFields />;
  if (type === "hint_rewrite")    return <HintRewriteFields />;
  if (type === "error_correction") return <ErrorCorrectionFields />;
  if (type === "matching")        return <MatchingFields />;
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
  form:            FormInstance;
  name:            number;
  restField:       any;
  index:           number;
  remove:          (index: number) => void;
  filteredMedia:   MediaItem[];
  availableRoles:  MediaRole[];
  onPreviewAsset:  (a: MediaItem) => void;
  currentType:     string;
  onRegisterObjectUrl: (url: string) => void;
}

function MediaItemRow({
  form,
  name,
  restField,
  index,
  remove,
  filteredMedia,
  availableRoles,
  onPreviewAsset,
  currentType,
  onRegisterObjectUrl,
}: MediaItemRowProps) {
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

  const currentMediaId    = itemState.mediaId;
  const currentFile       = itemState.file;
  const currentPreviewUrl = itemState.previewUrl;
  const currentFileName   = itemState.fileName;
  const currentFileType   = itemState.fileType;

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
      try { URL.revokeObjectURL(currentPreviewUrl); } catch (_) {}
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
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>

          {!hasItem ? (
            <Segmented
              size="small"
              value={mode}
              onChange={(val) => setMode(val as "upload" | "library")}
              className="bg-slate-100 p-0.5"
              options={[
                {
                  label: (
                    <div className="flex items-center gap-1.5 px-1 py-0.5 text-xs">
                      <UploadOutlined />
                      <span>Tải lên từ máy</span>
                    </div>
                  ),
                  value: "upload",
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
            <div className="flex items-center gap-1.5 truncate">
              {currentFile ? (
                <Tag color="cyan" className="text-[10px] px-2 py-0.5 rounded-full font-medium m-0">
                  Tệp từ máy tính (Sẵn sàng lưu)
                </Tag>
              ) : (
                <Tag color="blue" className="text-[10px] px-2 py-0.5 rounded-full font-medium m-0">
                  Từ thư viện Media
                </Tag>
              )}

              {isImg && (
                <Tag color="geekblue" className="text-[10px] px-1.5 py-0 leading-normal m-0 inline-flex items-center gap-1">
                  <LucideImage size={10} /> Hình ảnh
                </Tag>
              )}
              {isAud && (
                <Tag color="purple" className="text-[10px] px-1.5 py-0 leading-normal m-0 inline-flex items-center gap-1">
                  <Volume2 size={10} /> Âm thanh
                </Tag>
              )}
              {isVid && (
                <Tag color="orange" className="text-[10px] px-1.5 py-0 leading-normal m-0 inline-flex items-center gap-1">
                  <Video size={10} /> Video
                </Tag>
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
            className="mb-0 w-44"
          >
            <Select placeholder="Vai trò" size="small" className="w-full">
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
              shape="circle"
              icon={<DeleteOutlined />}
              onClick={() => {
                handleClearItem();
                remove(name);
              }}
              className="hover:bg-red-50 flex items-center justify-center"
            />
          </Tooltip>
        </div>
      </div>

      {/* When Empty: Selector controls */}
      {!hasItem && (
        mode === "upload" ? (
          <Upload.Dragger
            showUploadList={false}
            accept={
              currentType === "audio_choice"
                ? "audio/*,.mp3,.wav,.m4a,.ogg,.aac"
                : currentType === "image_choice"
                ? "image/*,.png,.jpg,.jpeg,.webp,.svg"
                : "audio/*,image/*,video/*"
            }
            beforeUpload={(file) => {
              if (currentType === "audio_choice" && !file.type.startsWith("audio/")) {
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
                  : currentType === "audio_choice" || fileType === "audio"
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
                {currentType === "audio_choice"
                  ? "Hỗ trợ MP3, WAV, M4A, OGG (Tối đa 20MB) • Xem trước ngay"
                  : currentType === "image_choice"
                  ? "Hỗ trợ PNG, JPG, JPEG, WEBP, SVG (Tối đa 20MB) • Xem trước ngay"
                  : "Hỗ trợ Âm thanh, Hình ảnh hoặc Video (Tối đa 20MB) • Xem trước ngay"}
              </p>
            </div>
          </Upload.Dragger>
        ) : (
          <Select
            showSearch
            placeholder="Tìm kiếm tệp theo tên hoặc mô tả trong thư viện..."
            className="w-full"
            allowClear
            size="middle"
            filterOption={(input, option) => {
              const label = (option?.label as string) ?? "";
              return label.toLowerCase().includes(input.toLowerCase());
            }}
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
                    : currentType === "audio_choice" || chosen.type === "audio"
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
          >
            {filteredMedia.map((asset) => {
              const isImgAsset = asset.type === "image" || asset.mimeType?.startsWith("image");
              const isAudAsset = asset.type === "audio" || asset.mimeType?.startsWith("audio");
              const fileName = asset.altText ?? asset.url.split("/").pop();
              return (
                <Select.Option key={asset.id} value={asset.id} label={fileName}>
                  <div className="flex items-center gap-2 py-0.5">
                    {isImgAsset ? (
                      <span className="w-4 h-4 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <LucideImage size={11} />
                      </span>
                    ) : isAudAsset ? (
                      <span className="w-4 h-4 rounded bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Volume2 size={11} />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Video size={11} />
                      </span>
                    )}
                    <span className="font-medium text-slate-700 truncate">{fileName}</span>
                    <span className="text-[10px] text-slate-400 ml-auto uppercase font-mono">
                      {asset.type || "FILE"}
                    </span>
                  </div>
                </Select.Option>
              );
            })}
          </Select>
        )
      )}

      {/* When Has Item: Rich Preview Card */}
      {hasItem && (
        <div className="flex items-center gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl">
          {/* Thumbnail / Icon */}
          {isImg ? (
            <div className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center relative shadow-xs">
              <AppImage
                src={previewSrc}
                autoResolve={!currentFile}
                alt={displayName}
                className="w-24 h-24 object-cover"
                maskText="Xem ảnh"
              />
            </div>
          ) : isAud ? (
            <div className="shrink-0 w-20 h-20 rounded-xl bg-violet-50 border border-violet-200 flex flex-col items-center justify-center text-violet-600 shadow-xs">
              <Volume2 size={26} className="mb-0.5 text-violet-600" />
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">Audio</span>
            </div>
          ) : isVid ? (
            <div className="shrink-0 w-20 h-20 rounded-xl bg-orange-50 border border-orange-200 flex flex-col items-center justify-center text-orange-600 shadow-xs">
              <Video size={26} className="mb-0.5 text-orange-600" />
              <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Video</span>
            </div>
          ) : (
            <div className="shrink-0 w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
              Media
            </div>
          )}

          {/* Details & Controls */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div
              className="font-semibold text-sm text-slate-800 truncate"
              title={displayName}
            >
              {displayName}
            </div>

            {/* Note if local file */}
            {currentFile ? (
              <div className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {(currentFile.size / 1024 / 1024).toFixed(2)} MB • Sẵn sàng tải lên khi bạn nhấn &quot;Lưu lại&quot;
              </div>
            ) : (
              <div className="text-xs text-slate-400 mt-0.5">
                Tệp từ thư viện Media • ID: {currentMediaId}
              </div>
            )}

            {/* Inline Audio Player if audio */}
            {isAud && previewSrc && (
              <div className="mt-2">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                  src={currentFile ? previewSrc : resolveMediaUrl(previewSrc)}
                  controls
                  className="h-8 w-full max-w-[340px]"
                />
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <Button
                type="link"
                size="small"
                icon={<ArrowLeftRight size={13} />}
                className="p-0 h-auto text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                onClick={handleClearItem}
              >
                Đổi tệp khác
              </Button>

              {selectedAsset && !isImg && (
                <Button
                  type="link"
                  size="small"
                  className="p-0 h-auto text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => onPreviewAsset(selectedAsset)}
                >
                  Xem chi tiết
                </Button>
              )}
            </div>
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
  form:            FormInstance;
  filteredMedia:   MediaItem[];
  availableRoles:  MediaRole[];
  onPreviewAsset:  (a: MediaItem) => void;
  currentType:     string;
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
                className="w-full rounded-xl h-9 text-slate-500 hover:text-indigo-500 hover:border-indigo-300 transition-all duration-200"
              >
                + Thêm liên kết Media
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
  availableRoles,
  onPreviewAsset,
  onUploadMedia,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  const handleRegisterObjectUrl = (url: string) => {
    objectUrlsRef.current.push(url);
  };

  const cleanupObjectUrls = () => {
    objectUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (_) {}
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
            : currentType === "audio_choice"
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
      } else if (currentType === "audio_choice") {
        const hasPromptAud = processedMediaIds.some((m) => m.role === "prompt_audio");
        if (!hasPromptAud) {
          if (processedMediaIds.length > 0) {
            processedMediaIds[0].role = "prompt_audio";
          } else {
            throw new Error("Câu hỏi lựa chọn âm thanh cần ít nhất một tệp âm thanh đề bài!");
          }
        }
      }

      await onFinish({
        ...values,
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
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="type" label="Loại câu hỏi" rules={[{ required: true, message: "Vui lòng chọn loại câu hỏi!" }]}>
              <Select
                className="rounded-xl"
                disabled={isEditing}
                onChange={(val) => {
                  onTypeChange(val);
                  form.setFieldsValue({ options: [], pairs: [], correctTokens: "", acceptedAnswers: "", passageId: undefined });
                  if (CHOICE_TYPES.includes(val)) {
                    form.setFieldsValue({ options: [
                      { label: "A", content: "", isCorrect: false },
                      { label: "B", content: "", isCorrect: false },
                    ]});
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
                {levels.map((l) => <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="skillId" label="Kỹ năng">
              <Select className="rounded-xl" placeholder="Chọn kỹ năng" allowClear>
                {skills.map((s) => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="topicId" label="Chủ đề">
              <Select className="rounded-xl" placeholder="Chọn chủ đề" allowClear>
                {topics.map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="tagIds" label="Thẻ gắn">
          <Select mode="multiple" className="rounded-xl" placeholder="Chọn các thẻ..." allowClear>
            {tags.map((t) => <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>)}
          </Select>
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
        <QuestionDetailFields type={currentType} passages={passages} />

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


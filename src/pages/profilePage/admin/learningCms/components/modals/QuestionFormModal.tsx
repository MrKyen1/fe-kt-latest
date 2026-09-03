import { Button, Checkbox, Col, Divider, Form, Input, InputNumber, Row, Select, Space, Switch, Tooltip } from "antd";
import type { FormInstance } from "antd";
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined, SoundOutlined } from "@ant-design/icons";
import { resolveMediaUrl } from "../../../../../../services/apiClient";
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
  onFinish:   (values: any) => void;

  isEditing:  boolean;

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
      <span className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình sắp xếp từ</span>
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
      <span className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình viết lại câu</span>
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
      <span className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình viết lại có gợi ý</span>
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
      <span className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình sửa lỗi</span>
      <Form.Item name="correctSentence" label="Đáp án" rules={[{ required: true, message: "Vui lòng nhập đáp án sửa đúng!" }]}>
        <Input.TextArea placeholder="Câu đã sửa đúng..." rows={2} className="rounded-xl" />
      </Form.Item>
    </div>
  );
}

function MatchingFields() {
  return (
    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
      <span className="text-sm font-semibold text-slate-700 block">⚙️ Cấu hình ghép đôi</span>
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
                <span className="text-slate-400">↔</span>
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

// ── Media section ─────────────────────────────────────────────

function MediaSection({
  form,
  filteredMedia,
  availableRoles,
  onPreviewAsset,
}: {
  form:            FormInstance;
  filteredMedia:   MediaItem[];
  availableRoles:  MediaRole[];
  onPreviewAsset:  (a: MediaItem) => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-sm">🖼️</span>
          </div>
          <span className="text-sm font-semibold text-slate-700">Tệp tin đa phương tiện (Media)</span>
        </div>
      </div>

      {/* List */}
      <div className="p-3">
        <Form.List name="mediaIds">
          {(mediaFields, { add, remove }) => (
            <div className="space-y-2">
              {mediaFields.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                  <span className="text-3xl mb-2">📂</span>
                  <span className="text-xs">Chưa có tệp tin nào. Nhấn bên dưới để thêm.</span>
                </div>
              )}

              {mediaFields.map(({ key, name, ...restField }, index) => {
                const currentMediaId = form.getFieldValue(["mediaIds", name, "mediaId"]);
                const selectedAsset  = filteredMedia.find((m) => m.id === currentMediaId);
                const isImg = selectedAsset?.type === "image" || selectedAsset?.mimeType?.startsWith("image");
                const isAud = selectedAsset?.type === "audio" || selectedAsset?.mimeType?.startsWith("audio");

                return (
                  <div
                    key={key}
                    className="group relative flex gap-2 items-center bg-white border border-slate-150 rounded-xl p-3 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
                    style={{ borderColor: "#f0f0f0" }}
                  >
                    {/* Index badge */}
                    <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-xs font-bold self-start mt-1">
                      {index + 1}
                    </div>

                    {/* Fields */}
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex gap-2 items-start">
                        {/* File select */}
                        <Form.Item
                          {...restField}
                          name={[name, "mediaId"]}
                          rules={[{ required: true, message: "Vui lòng chọn tệp media!" }]}
                          className="mb-0 flex-1 min-w-0"
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Chọn tệp tin (ảnh, âm thanh, video)..."
                            className="w-full"
                            allowClear
                            size="middle"
                            onChange={() => {
                              if (availableRoles.length === 1) {
                                form.setFieldValue(["mediaIds", name, "role"], availableRoles[0].value);
                              }
                            }}
                          >
                            {filteredMedia.map((asset) => (
                              <Select.Option key={asset.id} value={asset.id}>
                                [{asset.type?.toUpperCase()}]{" "}
                                {asset.altText ?? asset.url.split("/").pop()}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {/* Role select */}
                        <Form.Item
                          {...restField}
                          name={[name, "role"]}
                          rules={[{ required: true, message: "Vui lòng chọn vai trò media!" }]}
                          className="mb-0 w-44 shrink-0"
                          style={{ marginBottom: 0 }}
                        >
                          <Select placeholder="Vai trò" className="w-full" size="middle">
                            {availableRoles.map((r) => (
                              <Select.Option key={r.value} value={r.value}>{r.label}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {/* Thumbnail */}
                        {selectedAsset ? (
                          <Tooltip title="Nhấp để xem/nghe thử">
                            <div
                              className="shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:scale-105 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                              onClick={() => onPreviewAsset(selectedAsset)}
                            >
                              {isImg ? (
                                <img src={resolveMediaUrl(selectedAsset.url)} alt="Preview" className="w-full h-full object-cover" />
                              ) : isAud ? (
                                <SoundOutlined className="text-base text-indigo-500" />
                              ) : (
                                <span className="text-base">📹</span>
                              )}
                            </div>
                          </Tooltip>
                        ) : (
                          <div className="shrink-0 w-8 h-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                            <span className="text-slate-300 text-sm">?</span>
                          </div>
                        )}

                        {/* Delete */}
                        <Tooltip title="Xoá tệp này">
                          <Button
                            type="text"
                            danger
                            shape="circle"
                            icon={<DeleteOutlined />}
                            onClick={() => remove(name)}
                            className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-red-50 transition-all duration-200"
                          />
                        </Tooltip>
                      </div>

                      {/* Type badge */}
                      {selectedAsset && (
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${isImg ? "bg-blue-50 text-blue-600" : isAud ? "bg-violet-50 text-violet-600" : "bg-orange-50 text-orange-600"}`}>
                            {isImg ? "🖼️ Hình ảnh" : isAud ? "🔊 Âm thanh" : "📹 Video"}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                            {selectedAsset.altText ?? selectedAsset.url.split("/").pop()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

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

import { Modal } from "antd";

/**
 * Create / Edit Question modal.
 *
 * Contains the full Ant Design Form with:
 * - Question type and classification fields
 * - Prompt textarea
 * - Media attachments section
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
}: Props) {
  const handleFinishFailed = (errorInfo: any) => {
    if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
      const firstError = errorInfo.errorFields[0];
      form.scrollToField(firstError.name, { behavior: "smooth", block: "center", focus: true });
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <QuestionCircleOutlined className="text-indigo-600" />
          {isEditing ? "Cập nhật câu hỏi" : "Tạo câu hỏi mới"}
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={800}
      centered
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto", overflowX: "hidden", paddingRight: "8px" },
      }}
      className="rounded-2xl"
      okText="Lưu lại"
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={handleFinishFailed}
        scrollToFirstError={{ behavior: "smooth", block: "center", focus: true }}
        className="pt-2"
      >
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


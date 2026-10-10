import { createContext, useContext, useState } from "react";
import { Button, Checkbox, Input, InputNumber } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ServerSelect } from "./ServerSelect";
import { QUESTION_TYPE_LABELS, CONTENT_STATUS_LABELS } from "../pages/profilePage/admin/learningCms/constants";

export type CmsFilters = Record<string, string | string[]>;
export const CmsHeaderFilterContext = createContext<{
  filters: CmsFilters;
  apply: (patch: CmsFilters) => void;
  subjectId?: string;
}>({ filters: {}, apply: () => {} });
type Field = {
  key: string;
  label: string;
  endpoint?: string;
  options?: { value: string; label: string }[];
  text?: boolean;
  number?: boolean;
};
const statuses: Field = {
  key: "statuses",
  label: "Trạng thái",
  options: [
    { value: "draft", label: CONTENT_STATUS_LABELS.draft },
    { value: "published", label: CONTENT_STATUS_LABELS.published },
    { value: "archived", label: CONTENT_STATUS_LABELS.archived },
  ],
};
const search: Field = { key: "search", label: "Tìm kiếm", text: true };
const relation = (key: string, label: string, resource: string): Field => ({
  key,
  label,
  endpoint: `/learning/${resource}`,
});

function FilterPanel({
  fields,
  value,
  onChange,
  apply,
  reset,
}: {
  fields: Field[];
  value: CmsFilters;
  onChange: (value: CmsFilters) => void;
  apply: () => void;
  reset: () => void;
}) {
  const { subjectId } = useContext(CmsHeaderFilterContext);
  const [labels, setLabels] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  return (
    <div
      className="p-3 w-80 max-w-[calc(100vw-32px)] space-y-3"
      data-testid="cms-header-filter"
    >
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-xs text-slate-500 block mb-1">
            {field.label}
          </label>
          {field.number ? (
            <InputNumber
              aria-label={field.label}
              min={1}
              precision={0}
              className="w-full"
              placeholder={field.label}
              value={value[field.key] ? Number(value[field.key]) : null}
              onChange={(number) =>
                onChange({
                  ...value,
                  [field.key]: number == null ? "" : String(number),
                })
              }
            />
          ) : field.text ? (
            <Input
              aria-label={field.label}
              placeholder={field.label}
              value={(value[field.key] as string) || ""}
              allowClear
              onChange={(event) =>
                onChange({ ...value, [field.key]: event.target.value })
              }
              onPressEnter={apply}
            />
          ) : field.endpoint ? (
            <ServerSelect
              endpoint={field.endpoint}
              query={
                field.endpoint.endsWith("/tags")
                  ? {}
                  : { specializationId: subjectId }
              }
              aria-label={field.label}
              mode="multiple"
              className="w-full"
              placeholder={field.label}
              value={value[field.key] || []}
              allowClear
              maxTagCount="responsive"
              options={labels[field.key] || []}
              onRecords={(rows) =>
                setLabels((previous) => ({
                  ...previous,
                  [field.key]: Array.from(
                    new Map(
                      [
                        ...(previous[field.key] || []),
                        ...rows.map((row) => ({
                          value: row.id,
                          label: row.name || row.title,
                        })),
                      ].map((option) => [option.value, option]),
                    ).values(),
                  ),
                }))
              }
              onChange={(selected) =>
                onChange({ ...value, [field.key]: selected })
              }
            />
          ) : (
            <Checkbox.Group
              aria-label={field.label}
              className="flex flex-col gap-2 max-h-56 overflow-y-auto"
              value={(value[field.key] || []) as string[]}
              options={field.options}
              onChange={(selected) =>
                onChange({ ...value, [field.key]: selected })
              }
            />
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Button size="small" onClick={reset}>
          Đặt lại
        </Button>
        <Button type="primary" size="small" onClick={apply}>
          Áp dụng
        </Button>
      </div>
    </div>
  );
}

/** Header filters only commit server query values on Apply/Reset. */
export function useCmsHeaderFilters<T extends object>(
  columns: ColumnsType<T>,
  resource: string,
  override?: { filters: CmsFilters; apply: (patch: CmsFilters) => void },
): ColumnsType<T> {
  const inherited = useContext(CmsHeaderFilterContext);
  const context = override || inherited;
  const config: Record<string, Record<number, Field[]>> = {
    levels: { 0: [search] },
    skills: { 0: [search] },
    tags: { 0: [search] },
    topics: { 0: [search], 1: [relation("parentIds", "Chủ đề cha", "topics")] },
    questions: {
      0: [
        search,
        {
          key: "types",
          label: "Loại câu hỏi",
          options: Object.entries(QUESTION_TYPE_LABELS).map(
            ([value, label]) => ({ value, label }),
          ),
        },
      ],
      1: [
        relation("skillIds", "Kỹ năng", "skills"),
        relation("levelIds", "Level", "levels"),
        relation("topicIds", "Chủ đề", "topics"),
        relation("tagIds", "Tags", "tags"),
      ],
      2: [statuses],
    },
    exams: {
      0: [search],
      1: [
        {
          key: "examTypes",
          label: "Loại đề",
          options: [
            { value: "practice", label: "Đề ôn tập" },
            { value: "exam", label: "Đề kiểm tra" },
          ],
        },
      ],
      3: [statuses],
    },
    curriculums: {
      0: [search],
      1: [relation("examIds", "Đề thi", "exams")],
      2: [statuses],
    },
    passages: { 0: [search] },
    "exam-versions": {
      0: [{ key: "versionNumber", label: "Số phiên bản", number: true }],
    },
    "question-versions": {
      0: [{ key: "versionNumber", label: "Số phiên bản", number: true }],
      2: [search],
    },
  };
  return columns.map((column, index) => {
    const fields = config[resource]?.[index];
    if (!fields) return column;
    const applied = Object.fromEntries(
      fields.map((field) => [
        field.key,
        context.filters[field.key] || (field.text || field.number ? "" : []),
      ]),
    );
    const active = Object.values(applied).some((value) => value.length > 0);
    return {
      ...column,
      key: column.key || `cms-${resource}-${index}`,
      filterOnClose: false,
      filteredValue: active ? [JSON.stringify(applied)] : [],
      filterDropdown: ({
        selectedKeys,
        setSelectedKeys,
        confirm,
        clearFilters,
      }) => {
        const draft: CmsFilters = selectedKeys.length
          ? JSON.parse(String(selectedKeys[0]))
          : applied;
        return (
          <FilterPanel
            fields={fields}
            value={draft}
            onChange={(value) => setSelectedKeys([JSON.stringify(value)])}
            apply={() => {
              context.apply(
                Object.fromEntries(
                  fields.map((field) => [
                    field.key,
                    typeof draft[field.key] === "string"
                      ? (draft[field.key] as string).trim()
                      : draft[field.key] || [],
                  ]),
                ),
              );
              confirm({ closeDropdown: true });
            }}
            reset={() => {
              context.apply(
                Object.fromEntries(
                  fields.map((field) => [
                    field.key,
                    field.text || field.number ? "" : [],
                  ]),
                ),
              );
              clearFilters?.({ confirm: true, closeDropdown: true });
            }}
          />
        );
      },
    };
  });
}

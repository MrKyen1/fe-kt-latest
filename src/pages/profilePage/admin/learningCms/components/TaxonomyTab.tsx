import { Button, Input, Table, Tabs } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Target, Sparkles, Folder, Tag as TagIcon } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import { PAGE_SIZE_DEFAULT } from "../constants";
import { Can } from "../../../../../components/Can";

// ── Types ────────────────────────────────────────────────────

interface TaxItem {
  id: string;
  name: string;
  code?: string;
  rank?: number;
  parentId?: string;
}

interface Props {
  /** Currently selected inner tab key: levels | skills | topics | tags */
  taxTab: string;
  onTaxTabChange: (key: string) => void;

  taxSearch: string;
  onTaxSearchChange: (value: string) => void;
  searchPlaceholder: string;

  columns: ColumnsType<TaxItem>;
  dataSource: TaxItem[];
  loading: boolean;

  onCreateClick: () => void;
}

// ── Tabs config ──────────────────────────────────────────────

const TAX_TABS = [
  {
    key: "levels",
    label: (
      <span className="flex items-center gap-1.5">
        <Target size={14} />
        <span>Level</span>
      </span>
    ),
  },
  {
    key: "skills",
    label: (
      <span className="flex items-center gap-1.5">
        <Sparkles size={14} />
        <span>Kỹ năng</span>
      </span>
    ),
  },
  {
    key: "topics",
    label: (
      <span className="flex items-center gap-1.5">
        <Folder size={14} />
        <span>Chủ đề</span>
      </span>
    ),
  },
  {
    key: "tags",
    label: (
      <span className="flex items-center gap-1.5">
        <TagIcon size={14} />
        <span>Thẻ gắn</span>
      </span>
    ),
  },
];

// ── Component ────────────────────────────────────────────────

/**
 * Taxonomy management tab — contains the inner sub-tabs for
 * Levels / Skills / Topics / Tags, a search bar, a create
 * button, and the data table.
 *
 * All data-fetching and CRUD handlers live in the parent
 * LearningCms component; this component is purely presentational.
 */
export default function TaxonomyTab({
  taxTab,
  onTaxTabChange,
  taxSearch,
  onTaxSearchChange,
  searchPlaceholder,
  columns,
  dataSource,
  loading,
  onCreateClick,
}: Props) {
  return (
    <div className="space-y-4 pt-4">
      {/* Header row: inner tabs + search + create */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <Tabs
          type="card"
          activeKey={taxTab}
          onChange={onTaxTabChange}
          className="!mb-0"
          items={TAX_TABS}
        />

        <div className="flex items-center gap-3">
          <Input
            placeholder={searchPlaceholder}
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            value={taxSearch}
            onChange={(e) => onTaxSearchChange(e.target.value)}
            className="rounded-xl w-64 shadow-sm border-slate-200"
          />
          <Can perform="learning.write">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onCreateClick}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
            >
              Tạo mới
            </Button>
          </Can>
        </div>
      </div>

      {/* Data table */}
      <Table
        rowKey="id"
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        pagination={{ pageSize: PAGE_SIZE_DEFAULT, showSizeChanger: false }}
        locale={{ emptyText: "Không tìm thấy danh mục nào" }}
        className="border border-slate-100 rounded-2xl overflow-hidden"
      />
    </div>
  );
}

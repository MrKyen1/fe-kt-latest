import { Button, Modal, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import type { TablePaginationConfig } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getErrorMessage } from "../services/apiClient";
import { useCmsHeaderFilters } from "./CmsHeaderFilters";

interface InactiveListProps<T extends { id: string; updatedAt?: string }> {
  rows: T[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  describe: (row: T) => React.ReactNode;
  /** Omitted for records that cannot be brought back (questions, media, passages). */
  reactivate?: (id: string) => Promise<unknown>;
  onDone?: () => void;
  /** What reactivating brings back, shown in the confirm box. */
  confirmNote?: string;
  /** Shows the CMS column header filters, so the status filter can switch back to active records. */
  filterable?: boolean;
}

/** Deactivated records with the one action they support: bringing them back. */
export function InactiveList<T extends { id: string; updatedAt?: string }>({ rows, loading, pagination, describe, reactivate, onDone, confirmNote, filterable }: InactiveListProps<T>) {
  const handleReactivate = (row: T) => Modal.confirm({
    title: "Kích hoạt lại mục này?",
    width: 480,
    content: (
      <div className="flex flex-col gap-2 text-slate-600">
        <div className="font-semibold text-slate-700 break-words">{describe(row)}</div>
        {confirmNote && <div>{confirmNote}</div>}
      </div>
    ),
    okText: "Kích hoạt lại",
    cancelText: "Hủy",
    onOk: async () => {
      try {
        await reactivate!(row.id);
        message.success("Đã kích hoạt lại");
        onDone?.();
      } catch (error) {
        message.error(getErrorMessage(error, "Kích hoạt lại thất bại"), 5);
      }
    },
  });
  const columns: ColumnsType<T> = [
    {
      title: <span className="text-xs font-semibold text-slate-500">Tên</span>,
      key: "name",
      // The stop time sits under the name so the list also fits narrow side panels.
      render: (_, row) => (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700 break-words">{describe(row)}</div>
          {row.updatedAt && <div className="text-xs text-slate-400 mt-0.5">Ngừng lúc {dayjs(row.updatedAt).format("DD/MM/YYYY HH:mm")}</div>}
        </div>
      ),
    },
    {
      title: <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Trạng thái</span>,
      key: "status",
      align: "right",
      width: 1,
      render: (_, row) => reactivate ? (
        <Button size="small" onClick={() => handleReactivate(row)}
          className="!rounded-xl !font-semibold !text-xs !h-8 !px-3 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50">
          Kích hoạt lại
        </Button>
      ) : (
        <Tag className="!m-0 !rounded-lg !border-slate-200 !bg-slate-50 !text-slate-500 !text-xs whitespace-nowrap">Đã ngừng</Tag>
      ),
    },
  ];
  const headerColumns = useCmsHeaderFilters(columns, filterable ? "inactive" : "");
  return (
    <Table<T>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={rows}
      pagination={pagination}
      showHeader={!!filterable}
      className="border border-slate-100 rounded-2xl overflow-hidden"
      locale={{ emptyText: <span className="text-slate-400 text-sm">Không có mục nào đã ngừng hoạt động</span> }}
      columns={headerColumns}
    />
  );
}

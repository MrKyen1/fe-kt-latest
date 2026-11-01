import { Button, Table, message } from "antd";
import dayjs from "dayjs";
import type { TablePaginationConfig } from "antd";
import { getErrorMessage } from "../services/apiClient";

interface InactiveListProps<T extends { id: string; updatedAt?: string }> {
  rows: T[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  describe: (row: T) => React.ReactNode;
  /** Omitted for records that cannot be brought back (questions, media, passages). */
  reactivate?: (id: string) => Promise<unknown>;
  onDone?: () => void;
}

/** Deactivated records with the one action they support: bringing them back. */
export function InactiveList<T extends { id: string; updatedAt?: string }>({ rows, loading, pagination, describe, reactivate, onDone }: InactiveListProps<T>) {
  const handleReactivate = async (row: T) => {
    try {
      await reactivate!(row.id);
      message.success("Đã kích hoạt lại");
      onDone?.();
    } catch (error) {
      message.error(getErrorMessage(error, "Kích hoạt lại thất bại"), 5);
    }
  };
  return (
    <Table<T>
      rowKey="id"
      size="small"
      loading={loading}
      dataSource={rows}
      pagination={pagination}
      className="border border-slate-100 rounded-2xl overflow-hidden"
      locale={{ emptyText: <span className="text-slate-400 text-sm">Không có mục nào đã ngừng hoạt động</span> }}
      columns={[
        {
          title: <span className="text-xs font-semibold text-slate-500">Đã ngừng hoạt động</span>,
          key: "name",
          render: (_, row) => <span className="text-sm font-semibold text-slate-700">{describe(row)}</span>,
        },
        {
          title: <span className="text-xs font-semibold text-slate-500">Ngừng lúc</span>,
          key: "updatedAt",
          width: 150,
          responsive: ["sm"],
          render: (_, row) => <span className="text-xs text-slate-400">{row.updatedAt ? dayjs(row.updatedAt).format("DD/MM/YYYY HH:mm") : "—"}</span>,
        },
        {
          title: "",
          key: "action",
          align: "right",
          render: (_, row) => reactivate && (
            <Button size="small" onClick={() => handleReactivate(row)}
              className="!rounded-xl !font-semibold !text-xs !h-8 !px-3 !border-emerald-200 !text-emerald-700 hover:!bg-emerald-50">
              Kích hoạt lại
            </Button>
          ),
        },
      ]}
    />
  );
}

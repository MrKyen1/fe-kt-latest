import { Empty, Pagination } from "antd";
import type { TablePaginationConfig } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ReactNode } from "react";
import { PagedCollection } from "./PagedCollection";

type Column<T> = {
  title?: ReactNode;
  dataIndex?: string | string[];
  render?: (value: unknown, row: T, index: number) => ReactNode;
};

const read = (row: unknown, path?: string | string[]) =>
  path === undefined ? undefined : [path].flat().reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], row);

interface ColumnCardsProps<T extends { id: string }> {
  /** The same columns the desktop table uses. */
  columns: ColumnsType<T>;
  rows: T[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  /** How many leading columns form the card heading (the rest become label/value rows). */
  headingCount?: number;
  emptyText?: string;
}

/**
 * Phone stand-in for a table: every row becomes a card built from the table's
 * columns. Leading columns are the heading, the last column (actions or status
 * button) is the footer, and everything between is a label/value row.
 */
export function ColumnCards<T extends { id: string }>({ columns, rows, loading, pagination, headingCount = 1, emptyText = "Không có dữ liệu" }: ColumnCardsProps<T>) {
  const all = columns as Column<T>[];
  const heading = all.slice(0, headingCount);
  const footer = all.length > headingCount ? all[all.length - 1] : undefined;
  const middle = all.slice(headingCount, footer ? -1 : undefined);
  const cell = (column: Column<T>, row: T, index: number) =>
    column.render ? column.render(read(row, column.dataIndex), row, index) : (read(row, column.dataIndex) as ReactNode);
  const pager = pagination && (
    <div className="pt-2 flex flex-col items-center justify-center gap-2">
      <span className="text-xs text-slate-400">Tổng cộng {pagination.total ?? rows.length} mục</span>
      <Pagination
        current={pagination.current}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onChange={pagination.onChange}
        size="small"
        showSizeChanger={false}
      />
    </div>
  );
  return (
    <PagedCollection loading={loading} hasData={rows.length > 0} variant="list" footer={pager}>
      <div className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <div className="py-10 bg-white rounded-2xl border border-slate-100 text-center shadow-xs">
            <Empty description={<span className="text-slate-400 text-xs">{emptyText}</span>} />
          </div>
        ) : (
          rows.map((row, index) => (
            <div key={row.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col gap-3">
              <div className="flex flex-col gap-1 min-w-0 break-words">
                {heading.map((column, i) => <div key={i}>{cell(column, row, index)}</div>)}
              </div>
              {middle.map((column, i) => (
                <div key={i} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-400 shrink-0">{column.title}</span>
                  <div className="text-slate-700 text-right min-w-0 max-w-full">{cell(column, row, index)}</div>
                </div>
              ))}
              {footer && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
                  {cell(footer, row, index)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </PagedCollection>
  );
}

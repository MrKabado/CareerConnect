import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  /** Used for the default row. Omit when you pass `renderRow`. */
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Render a whole <tr> yourself (e.g. a UserRow). Columns still draw the header. */
  renderRow?: (row: T) => ReactNode;
  footer?: ReactNode;
  emptyMessage?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  getRowKey,
  renderRow,
  footer,
  emptyMessage = "No results found.",
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-5 py-3 font-medium ${c.headerClassName ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : renderRow ? (
              rows.map((row) => <Row key={getRowKey(row)}>{renderRow(row)}</Row>)
            ) : (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="hover:bg-canvas/60">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-5 py-3.5 ${c.cellClassName ?? ""}`}
                    >
                      {c.render?.(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
    </div>
  );
}

/** Pass-through so `key` sits on a component and renderRow can return a <tr>. */
function Row({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

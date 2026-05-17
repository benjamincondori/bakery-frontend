import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  emptyMessage?: string;
}

const PAGE_SIZES = [10, 20, 50, 100, 1000] as const;

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function Table<T extends { id: string }>({
  columns, data, loading, meta, onPageChange, onLimitChange, emptyMessage = 'No hay datos',
}: TableProps<T>) {
  return (
    <div>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.className}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
              : data.length === 0
              ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-stone-400">
                    {emptyMessage}
                  </td>
                </tr>
              )
              : data.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-stone-600 dark:text-stone-400 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Filas por página:</span>
            <select
              value={meta.limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className="input py-1 px-2 text-sm"
              style={{ width: 'auto' }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>{n === 1000 ? 'Todos' : n}</option>
              ))}
            </select>
          </div>

          <p>
            Mostrando {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </p>

          {meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(meta.page - 1)}
                disabled={!meta.hasPrevPage}
                className="btn-secondary p-2 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium">{meta.page} / {meta.totalPages}</span>
              <button
                onClick={() => onPageChange?.(meta.page + 1)}
                disabled={!meta.hasNextPage}
                className="btn-secondary p-2 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

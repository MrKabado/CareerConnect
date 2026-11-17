import Button from "./Button";

interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  onPageChange: (page: number) => void;
  summary: string;
}

export default function Pagination({
  page,
  pageCount,
  onPageChange,
  summary,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-muted">
      <span>{summary}</span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

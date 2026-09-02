import { ReactElement } from "react";
import { Button } from "./Button";

type PaginationProps = {
  page: number;
  pageSize: number;
  records: unknown[];
  handlePageChange: (newPage: number) => void;
  total?: number;
};

export function Pagination({
  page,
  pageSize,
  records,
  handlePageChange,
  total,
}: PaginationProps): ReactElement {
  const hasNextPage =
    total !== undefined
      ? (page + 1) * pageSize < total
      : (records.length || 0) >= pageSize;

  return (
    <div className="flex justify-between items-center mt-4">
      <Button onClick={() => handlePageChange(page - 1)} disabled={page === 0}>
        Previous
      </Button>
      <span>
        Page {page + 1}
        {total !== undefined
          ? ` (${records.length} of ${total} records)`
          : ` (showing ${records.length} records)`}
      </span>
      <Button
        onClick={() => handlePageChange(page + 1)}
        disabled={!hasNextPage}
      >
        Next
      </Button>
    </div>
  );
}

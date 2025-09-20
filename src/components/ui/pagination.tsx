import { ReactElement } from "react";
import { Button } from "./button";

type PaginationProps = {
  page: number;
  pageSize: number;
  records: unknown[];
  handlePageChange: (newPage: number) => void;
};

export function Pagination({
  page,
  pageSize,
  records,
  handlePageChange,
}: PaginationProps): ReactElement {
  return (
    <div className="flex justify-between items-center mt-4">
      <Button onClick={() => handlePageChange(page - 1)} disabled={page === 0}>
        Previous
      </Button>
      <span>
        Page {page + 1} (showing {records.length} records)
      </span>
      <Button
        onClick={() => handlePageChange(page + 1)}
        disabled={(records.length || 0) < pageSize}
      >
        Next
      </Button>
    </div>
  );
}

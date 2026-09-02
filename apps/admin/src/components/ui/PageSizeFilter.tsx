import { ReactElement } from "react";
import { DropdownFilter } from "./DropdownFilter";

const PAGE_SIZE_OPTIONS = [
  { value: "10" },
  { value: "25" },
  { value: "50" },
  { value: "100" },
];

interface PageSizeFilterProps {
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}

export function PageSizeFilter({
  pageSize,
  onPageSizeChange,
}: PageSizeFilterProps): ReactElement {
  return (
    <DropdownFilter
      title="Page size"
      options={PAGE_SIZE_OPTIONS}
      value={pageSize.toString()}
      onChange={(value) => onPageSizeChange(Number.parseInt(value, 10))}
    />
  );
}

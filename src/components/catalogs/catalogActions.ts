import { MdCode } from "react-icons/md";
import { CatalogCardAction } from "../ui/CardActionsMenu";

const ORIGINAL_DATA_ACTION_DESCRIPTION =
  "Open SQL query for underlying records";

export function originalDataAction(sql: string): CatalogCardAction {
  return {
    title: "View original data",
    description: ORIGINAL_DATA_ACTION_DESCRIPTION,
    icon: MdCode,
    href: `/data-catalog/query?q=${encodeURIComponent(sql)}`,
  };
}

import { ReactElement, MouseEvent } from "react";
import { MdLink } from "react-icons/md";
import { useNavigate } from "react-router-dom";

export function CardAnchorLink({
  anchorId,
}: {
  anchorId: string;
}): ReactElement {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    navigate({ hash: anchorId }, { replace: true });
  }

  return (
    <a
      href={`#${anchorId}`}
      onClick={handleClick}
      className="text-muted hover:text-accent opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-opacity shrink-0"
      aria-label="Link to this section"
    >
      <MdLink size={16} />
    </a>
  );
}

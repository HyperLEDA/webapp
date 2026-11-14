import { ReactElement } from "react";
import { MdLogout } from "react-icons/md";
import { NavButton } from "@leda/lib/ui";

function autheliaLogoutUrl(): string {
  const { origin, hostname } = window.location;
  const match = /^admin\.(.+)$/.exec(hostname);
  if (match) {
    return `https://auth.${match[1]}/logout?rd=${encodeURIComponent(origin)}`;
  }
  const parentDomain = hostname.split(".").slice(1).join(".");
  return `${window.location.protocol}//auth.${parentDomain}/logout?rd=${encodeURIComponent(origin)}`;
}

export function AuthNavControl(): ReactElement {
  return (
    <NavButton
      label="Logout"
      onClick={() => window.location.assign(autheliaLogoutUrl())}
    >
      <MdLogout size={20} />
    </NavButton>
  );
}

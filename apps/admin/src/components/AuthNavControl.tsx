import { ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdLogin, MdLogout } from "react-icons/md";
import { clearAuthToken, useIsLoggedIn } from "../auth";
import { logout } from "../clients/admin/sdk.gen";
import { adminClient } from "../clients/index";
import { NavButton, NavItem } from "@hyperleda/lib/ui";

export function AuthNavControl(): ReactElement {
  const navigate = useNavigate();
  const loggedIn = useIsLoggedIn();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    try {
      await logout({
        client: adminClient,
        body: {},
      });
    } finally {
      clearAuthToken();
      navigate("/login");
      setLoggingOut(false);
    }
  }

  if (loggedIn) {
    return (
      <NavButton label="Logout" onClick={handleLogout} disabled={loggingOut}>
        <MdLogout size={20} />
      </NavButton>
    );
  }

  return (
    <NavItem to="/login" end label="Login">
      <MdLogin size={20} />
    </NavItem>
  );
}

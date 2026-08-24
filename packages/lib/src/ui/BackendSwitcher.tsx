import type { ReactElement } from "react";
import { MdCloud, MdScience } from "react-icons/md";
import {
  backendEnvironmentLabel,
  nextBackendEnvironment,
  readDevBackendEnvironment,
  setDevBackendEnvironment,
} from "../config";
import { NavButton } from "./NavRail";

interface BackendSwitcherProps {
  onBeforeSwitch?: () => void;
}

export function BackendSwitcher({
  onBeforeSwitch,
}: BackendSwitcherProps): ReactElement | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const currentEnvironment = readDevBackendEnvironment();
  const nextEnvironment = nextBackendEnvironment(currentEnvironment);
  const label = `Backend: ${backendEnvironmentLabel(currentEnvironment)} (click to switch to ${backendEnvironmentLabel(nextEnvironment)})`;
  const icon =
    currentEnvironment === "test" ? (
      <MdScience size={20} />
    ) : (
      <MdCloud size={20} />
    );

  function handleSwitch(): void {
    onBeforeSwitch?.();
    setDevBackendEnvironment(nextEnvironment);
    window.location.reload();
  }

  return (
    <NavButton
      onClick={handleSwitch}
      aria-label="Switch backend environment"
      label={label}
    >
      {icon}
    </NavButton>
  );
}

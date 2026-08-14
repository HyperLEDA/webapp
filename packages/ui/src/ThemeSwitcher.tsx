import type { ReactElement } from "react";
import { MdDarkMode, MdLightMode, MdSettingsBrightness } from "react-icons/md";
import { NavRailButton } from "./NavRailButton";
import {
  nextThemePreference,
  themePreferenceLabel,
  useTheme,
} from "./useTheme";

export function ThemeSwitcher(): ReactElement {
  const { theme, cycleTheme } = useTheme();
  const nextTheme = nextThemePreference(theme);
  const label = `Theme: ${themePreferenceLabel(theme)} (click to switch to ${themePreferenceLabel(nextTheme)})`;

  const icon =
    theme === "system" ? (
      <MdSettingsBrightness size={20} />
    ) : theme === "light" ? (
      <MdLightMode size={20} />
    ) : (
      <MdDarkMode size={20} />
    );

  return (
    <NavRailButton onClick={cycleTheme} aria-label="Toggle theme" title={label}>
      {icon}
    </NavRailButton>
  );
}

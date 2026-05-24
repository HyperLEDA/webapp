import { ReactElement } from "react";
import { MdDarkMode, MdLightMode, MdSettingsBrightness } from "react-icons/md";
import {
  nextThemePreference,
  themePreferenceLabel,
  useTheme,
} from "../../hooks/useTheme";
import { SidebarRailButton, SidebarTooltip } from "./SidebarRail";

export function ThemeSwitcher(): ReactElement {
  const { theme, cycleTheme } = useTheme();
  const nextTheme = nextThemePreference(theme);

  const icon =
    theme === "system" ? (
      <MdSettingsBrightness size={20} />
    ) : theme === "light" ? (
      <MdLightMode size={20} />
    ) : (
      <MdDarkMode size={20} />
    );

  return (
    <SidebarTooltip
      content={`Theme: ${themePreferenceLabel(theme)} (click to switch to ${themePreferenceLabel(nextTheme)})`}
    >
      <SidebarRailButton onClick={cycleTheme} aria-label="Toggle theme">
        {icon}
      </SidebarRailButton>
    </SidebarTooltip>
  );
}

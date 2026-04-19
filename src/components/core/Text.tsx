import { ElementType, ReactElement, ReactNode } from "react";
import classNames from "classnames";

export type TextStyle = "header" | "info";
export type TextSize = "small" | "medium" | "large";
export type TextType = "code" | "normal";

const headerBySize: Record<TextSize, string> = {
  small: "text-sm font-medium text-white leading-snug",
  medium: "text-2xl font-semibold text-white leading-snug max-w-3xl",
  large: "text-3xl font-semibold text-white leading-snug",
};

const infoBySize: Record<TextSize, string> = {
  small: "text-xs text-gray-400 leading-snug",
  medium: "text-sm text-gray-400 leading-relaxed",
  large: "text-lg text-gray-300",
};

interface TextProps {
  style?: TextStyle;
  size?: TextSize;
  type?: TextType;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}

export function Text({
  style = "info",
  size = "medium",
  type = "normal",
  as: Component = "span",
  className,
  children,
}: TextProps): ReactElement {
  return (
    <Component
      className={classNames(
        style === "header" ? headerBySize[size] : infoBySize[size],
        type === "code" && "font-mono tracking-tight",
        className,
      )}
    >
      {children}
    </Component>
  );
}

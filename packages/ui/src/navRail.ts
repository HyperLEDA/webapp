export function navRailControlClassName(active: boolean): string {
  return `w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-300 cursor-pointer ${
    active
      ? "bg-accent text-accent-fg"
      : "text-muted hover:bg-surface hover:text-primary"
  }`;
}

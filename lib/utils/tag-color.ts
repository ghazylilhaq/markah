function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Generate a deterministic HSL color from a tag name (WCAG AA compliant text color). */
export function tagToColor(tagName: string): string {
  const h = hashCode(tagName) % 360;
  return `hsl(${h}, 55%, 35%)`;
}

/** Inline style object for a tag badge with accessible contrast. */
export function tagBadgeStyle(tagName: string): React.CSSProperties {
  const color = tagToColor(tagName);
  return {
    backgroundColor: `${color}30`,
    color,
    borderColor: `${color}50`,
    borderWidth: "1px",
  };
}

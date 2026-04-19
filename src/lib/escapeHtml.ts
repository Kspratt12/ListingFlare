// Escape user-provided strings before interpolating into HTML email templates.
// Prevents a lead from smuggling <script>, <a>, or other markup into the
// agent's inbox. Email clients vary in how they sandbox HTML - some render
// links and styles, others don't - so we escape defensively.
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

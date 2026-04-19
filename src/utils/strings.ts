export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function slugify(text: string): string {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[`'"!?.,()[\]{}:;<>/@#$%^&*+=~|\\]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

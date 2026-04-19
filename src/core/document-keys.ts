import type { HeadingRecord } from "./types";

export function buildSiblingBucketKey(heading: HeadingRecord): string {
  return `${heading.container.key}::${heading.parentKey ?? "root"}::${heading.level}`;
}

export function buildHeadingBaseKey(containerKey: string, anchor: string): string {
  return `${containerKey}::${anchor}`;
}

export function buildHeadingKey(containerKey: string, anchor: string, duplicateIndex: number): string {
  const baseKey = buildHeadingBaseKey(containerKey, anchor);
  if (duplicateIndex === 0) {
    return baseKey;
  }

  return `${baseKey}::${duplicateIndex + 1}`;
}

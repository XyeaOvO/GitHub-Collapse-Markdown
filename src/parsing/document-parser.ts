import { buildHeadingKey, buildSiblingBucketKey } from "../core/document-keys";
import { PageDocument } from "../core/page-document";
import type { ContainerRecord, ContentContainer, HeadingBinding, HeadingRecord } from "../core/types";
import { getHeadingAnchor, getHeadingBlock, getHeadingLevel, getHeadingText, queryHeadings } from "./heading-dom";

export function buildDocument(containers: ContentContainer[]): PageDocument {
  const containerRecords: ContainerRecord[] = [];
  const headings: HeadingRecord[] = [];
  const headingBindings: HeadingBinding[] = [];
  const headingPathKeys = new Map<string, string[]>();
  const siblingIndex = new Map<string, string[]>();

  for (const container of containers) {
    const { containerRecord, records, bindings } = buildContainerDocument(container, headingPathKeys, siblingIndex);
    containerRecords.push(containerRecord);
    headings.push(...records);
    headingBindings.push(...bindings);
  }

  return new PageDocument({
    containers: containerRecords,
    headings,
    containerElements: containers.map((container) => ({ key: container.key, element: container.element })),
    headingBindings,
    headingPathKeys,
    siblingIndex
  });
}

function buildContainerDocument(
  container: ContentContainer,
  headingPathKeys: Map<string, string[]>,
  siblingIndex: Map<string, string[]>
): {
  containerRecord: ContainerRecord;
  records: HeadingRecord[];
  bindings: HeadingBinding[];
} {
  const containerRecord: ContainerRecord = {
    key: container.key,
    label: container.label,
    kind: container.kind
  };
  const containerHeadings = queryHeadings(container.element);
  const records: HeadingRecord[] = [];
  const bindings: HeadingBinding[] = [];
  const ancestryStack: HeadingRecord[] = [];
  const duplicateHeadingCounts = new Map<string, number>();

  for (let index = 0; index < containerHeadings.length; index += 1) {
    const headingEl = containerHeadings[index];
    const level = getHeadingLevel(headingEl);
    const anchor = getHeadingAnchor(headingEl, index);
    const text = getHeadingText(headingEl);
    const duplicateIndex = duplicateHeadingCounts.get(anchor) ?? 0;

    duplicateHeadingCounts.set(anchor, duplicateIndex + 1);

    while (ancestryStack.length > 0 && level <= ancestryStack[ancestryStack.length - 1].level) {
      ancestryStack.pop();
    }

    const record: HeadingRecord = {
      key: buildHeadingKey(container.key, anchor, duplicateIndex),
      anchor,
      level,
      text,
      container: containerRecord,
      parentKey: ancestryStack[ancestryStack.length - 1]?.key ?? null
    };

    const binding: HeadingBinding = {
      key: record.key,
      headingEl,
      blockEl: getHeadingBlock(headingEl),
      sectionEls: []
    };

    records.push(record);
    bindings.push(binding);
    headingPathKeys.set(record.key, ancestryStack.map((heading) => heading.key));
    ancestryStack.push(record);

    const siblingBucketKey = buildSiblingBucketKey(record);
    const siblingKeys = siblingIndex.get(siblingBucketKey) ?? [];
    siblingKeys.push(record.key);
    siblingIndex.set(siblingBucketKey, siblingKeys);
  }

  populateSectionElements(container.element, records, bindings);

  return {
    containerRecord,
    records,
    bindings
  };
}

function populateSectionElements(
  containerElement: HTMLElement,
  records: HeadingRecord[],
  bindings: HeadingBinding[]
): void {
  if (records.length === 0) {
    return;
  }

  if (bindings.every((binding) => binding.blockEl.parentElement === containerElement)) {
    const headingIndexByBlock = new Map<HTMLElement, number>();
    bindings.forEach((binding, index) => headingIndexByBlock.set(binding.blockEl, index));

    const openHeadingIndexes: number[] = [];
    for (const child of Array.from(containerElement.children) as HTMLElement[]) {
      if (child.closest(".ghcm-root")) {
        continue;
      }

      const headingIndex = headingIndexByBlock.get(child);
      if (headingIndex === undefined) {
        openHeadingIndexes.forEach((index) => bindings[index].sectionEls.push(child));
        continue;
      }

      while (
        openHeadingIndexes.length > 0 &&
        records[openHeadingIndexes[openHeadingIndexes.length - 1]].level >= records[headingIndex].level
      ) {
        openHeadingIndexes.pop();
      }

      openHeadingIndexes.forEach((index) => bindings[index].sectionEls.push(child));
      openHeadingIndexes.push(headingIndex);
    }
    return;
  }

  const boundaryIndexes = computeBoundaryIndexes(records);
  for (let index = 0; index < bindings.length; index += 1) {
    const current = bindings[index];
    const boundaryIndex = boundaryIndexes[index];
    const boundary = boundaryIndex === null ? null : bindings[boundaryIndex].blockEl;
    let cursor = current.blockEl.nextElementSibling as HTMLElement | null;
    while (cursor && cursor !== boundary) {
      if (!cursor.closest(".ghcm-root")) {
        current.sectionEls.push(cursor);
      }
      cursor = cursor.nextElementSibling as HTMLElement | null;
    }
  }
}

function computeBoundaryIndexes(records: HeadingRecord[]): Array<number | null> {
  const boundaryIndexes: Array<number | null> = new Array(records.length).fill(null);
  const nextHeadingIndexByLevel: Array<number | undefined> = new Array(7).fill(undefined);

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const currentLevel = records[index].level;
    let boundaryIndex: number | undefined;

    for (let level = 1; level <= currentLevel; level += 1) {
      const candidateIndex = nextHeadingIndexByLevel[level];
      if (candidateIndex === undefined) {
        continue;
      }
      if (boundaryIndex === undefined || candidateIndex < boundaryIndex) {
        boundaryIndex = candidateIndex;
      }
    }

    boundaryIndexes[index] = boundaryIndex ?? null;
    nextHeadingIndexByLevel[currentLevel] = index;
  }

  return boundaryIndexes;
}

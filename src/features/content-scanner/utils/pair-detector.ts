import type { ContentMetadata } from '../types';

/**
 * Suffixes that indicate a file is an answer/solution companion.
 * Order matters: more specific patterns first.
 */
const ANSWER_SUFFIXES = [
  ' - Answers',
  ' - Answer',
  ' - Solutions',
  ' - Solution',
  ' - Answer Key',
  '-Answers',
  '-Answer',
  '_Answers',
  '_Answer',
  'MOCK-A',  // Kevin Sir's mock answers
];

/**
 * Detect paired question/answer files and link them.
 * Mutates the input array by setting `pairedWith` on matched entries.
 * Returns list of files with missing pairs.
 */
export function detectPairs(resources: ContentMetadata[]): string[] {
  const missingPairs: string[] = [];
  const fileMap = new Map<string, ContentMetadata>();

  // Build a map for quick lookup
  for (const resource of resources) {
    fileMap.set(resource.relativePath, resource);
  }

  for (const resource of resources) {
    if (resource.pairedWith) continue; // Already paired

    // Check if this file IS an answer file
    const baseFile = getBaseFileName(resource.relativePath);
    if (baseFile && baseFile !== resource.relativePath) {
      // This is an answer file — look for the question file
      const questionFile = fileMap.get(baseFile);
      if (questionFile) {
        resource.pairedWith = questionFile.relativePath;
        questionFile.pairedWith = resource.relativePath;
      } else {
        // Also handle MOCK-Q / MOCK-A pattern
        if (!resource.relativePath.includes('MOCK-A')) {
          missingPairs.push(resource.relativePath);
        }
      }
      continue;
    }

    // Check if there's an answer file for this question file
    const answerPath = findAnswerFile(resource.relativePath, fileMap);
    if (answerPath) {
      const answerFile = fileMap.get(answerPath);
      if (answerFile) {
        resource.pairedWith = answerFile.relativePath;
        answerFile.pairedWith = resource.relativePath;
      }
    }
  }

  // Handle MOCK-Q / MOCK-A pattern
  for (const resource of resources) {
    if (resource.pairedWith) continue;
    if (resource.relativePath.includes('MOCK-Q')) {
      const answerPath = resource.relativePath.replace('MOCK-Q', 'MOCK-A');
      const answerFile = fileMap.get(answerPath);
      if (answerFile) {
        resource.pairedWith = answerFile.relativePath;
        answerFile.pairedWith = resource.relativePath;
      }
    }
  }

  return missingPairs;
}

/**
 * Given an answer file path, derive the base (question) file path.
 * Returns null if this is not an answer file.
 */
function getBaseFileName(path: string): string | null {
  for (const suffix of ANSWER_SUFFIXES) {
    const ext = '.pdf';
    const suffixWithExt = suffix + ext;
    if (path.toLowerCase().endsWith(suffixWithExt.toLowerCase())) {
      return path.slice(0, path.length - suffixWithExt.length) + ext;
    }
  }
  return null;
}

/**
 * Given a question file path, find its answer companion in the map.
 */
function findAnswerFile(
  questionPath: string,
  fileMap: Map<string, ContentMetadata>
): string | null {
  const pathWithoutExt = questionPath.replace(/\.pdf$/i, '');

  for (const suffix of ANSWER_SUFFIXES) {
    const candidate = pathWithoutExt + suffix + '.pdf';
    // Case-insensitive search
    for (const [key] of fileMap) {
      if (key.toLowerCase() === candidate.toLowerCase()) {
        return key;
      }
    }
  }

  return null;
}

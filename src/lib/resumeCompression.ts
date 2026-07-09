import LZString from 'lz-string';
import { ResumeData } from '@/types/resume';

/**
 * Compress resume parsed JSON for IndexedDB storage.
 * Returns undefined if serialization/compression fails.
 */
export function compressResumeData(parsedData: ResumeData): string | undefined {
  try {
    return LZString.compressToUTF16(JSON.stringify(parsedData));
  } catch {
    return undefined;
  }
}

/**
 * Decompress resume payload from IndexedDB.
 * Returns undefined if decompression or JSON parse fails.
 */
export function decompressResumeData(compressedData: string): ResumeData | undefined {
  try {
    const json = LZString.decompressFromUTF16(compressedData);
    if (!json) return undefined;
    return JSON.parse(json) as ResumeData;
  } catch {
    return undefined;
  }
}

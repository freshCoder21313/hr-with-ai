import { logger } from '@/lib/logger';
// Remove top-level import
// import * as pdfjsLib from 'pdfjs-dist';

/**
 * Extract text content from PDF file
 */
const parsePDF = async (file: File): Promise<string> => {
  // Dynamic import for better performance
  const pdfjsLib = await import('pdfjs-dist');

  // Configure Worker for PDF.js using CDN
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();

  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  // Iterate through pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Join text items together
    const pageText = textContent.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join('');

    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};

/**
 * Read content from Text file
 */
const parseText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

/**
 * Main function to parse resume based on file type
 */
export const parseResume = async (file: File): Promise<string> => {
  const fileType = file.type;

  try {
    if (fileType === 'application/pdf') {
      return await parsePDF(file);
    } else if (fileType.startsWith('text/')) {
      return await parseText(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF or TXT.');
    }
  } catch (error) {
    logger.error('Error parsing resume:', error);
    throw error;
  }
};

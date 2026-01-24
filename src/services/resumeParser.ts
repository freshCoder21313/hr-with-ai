// Remove top-level import
// import * as pdfjsLib from 'pdfjs-dist';

/**
 * Đọc nội dung text từ file PDF
 */
const parsePDF = async (file: File): Promise<string> => {
  // Dynamic import for better performance
  const pdfjsLib = await import('pdfjs-dist');

  // Cấu hình Worker cho PDF.js
  // Sử dụng file local trong thư mục public để hỗ trợ Offline hoàn toàn
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();

  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';
  // ... rest of logic


  // Lặp qua từng trang
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Nối các item text lại với nhau
    const pageText = textContent.items.map((item: any) => item.str).join(' ');

    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};

/**
 * Đọc nội dung từ file Text
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
 * Hàm chính để parse resume dựa trên loại file
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
    console.error('Error parsing resume:', error);
    throw error;
  }
};

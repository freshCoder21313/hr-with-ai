import * as pdfjsLib from 'pdfjs-dist';

// Cấu hình Worker cho PDF.js
// Cách tối ưu cho Vite: Sử dụng dynamic import url hoặc trỏ về CDN khớp version.
// Để đảm bảo chạy ổn định mà không cần config Vite phức tạp, ta dùng CDN cho worker.
// pdfjsLib.version tự động lấy version của lib đang cài.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Đọc nội dung text từ file PDF
 */
const parsePDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  // Lặp qua từng trang
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Nối các item text lại với nhau
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
      
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
      throw new Error("Unsupported file type. Please upload PDF or TXT.");
    }
  } catch (error) {
    console.error("Error parsing resume:", error);
    throw error;
  }
};

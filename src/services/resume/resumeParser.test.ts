import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResume } from './resumeParser';

describe('resumeParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse text files successfully', async () => {
    const textContent = 'John Doe - Software Engineer';
    const file = new File([textContent], 'resume.txt', { type: 'text/plain' });

    const result = await parseResume(file);
    expect(result).toBe(textContent);
  });

  it('should reject unsupported file types', async () => {
    const file = new File(['content'], 'image.png', { type: 'image/png' });

    await expect(parseResume(file)).rejects.toThrow(
      'Unsupported file type. Please upload PDF or TXT.'
    );
  });

  it('should dynamically configure workerSrc using matching pdfjsLib.version for PDF files', async () => {
    const mockGetTextContent = vi.fn().mockResolvedValue({
      items: [{ str: 'Jane Doe' }, { str: ' - Tech Lead' }],
    });
    const mockGetPage = vi.fn().mockResolvedValue({
      getTextContent: mockGetTextContent,
    });
    const mockGetDocument = vi.fn().mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: mockGetPage,
      }),
    });

    const mockGlobalWorkerOptions = { workerSrc: '' };

    vi.doMock('pdfjs-dist', () => ({
      version: '5.5.207',
      GlobalWorkerOptions: mockGlobalWorkerOptions,
      getDocument: mockGetDocument,
    }));

    const file = new File(['%PDF-fake'], 'resume.pdf', { type: 'application/pdf' });
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    const result = await parseResume(file);

    expect(mockGlobalWorkerOptions.workerSrc).toBe(
      'https://unpkg.com/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs'
    );
    expect(result).toBe('Jane Doe - Tech Lead');
  });
});

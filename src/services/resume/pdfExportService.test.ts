import { describe, it, expect, vi, beforeEach } from 'vitest';

const save = vi.fn();
const addPage = vi.fn();
const addImage = vi.fn();
const output = vi.fn(() => 'data:application/pdf;base64,QUJD');
const getImageProperties = vi.fn(() => ({ width: 794, height: 1000 }));

vi.mock('jspdf', () => ({
  default: class {
    save = save;
    addPage = addPage;
    addImage = addImage;
    output = output;
    getImageProperties = getImageProperties;
  },
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,AAAA'),
}));

const isNativePlatform = vi.fn();
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }));

const writeFile = vi.fn().mockResolvedValue({ uri: 'file:///cache/My_CV.pdf' });
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: (...args: unknown[]) => writeFile(...args) },
  Directory: { Cache: 'CACHE' },
}));

const share = vi.fn().mockResolvedValue(undefined);
vi.mock('@capacitor/share', () => ({ Share: { share: (...args: unknown[]) => share(...args) } }));

import { exportElementToPdf } from './pdfExportService';

describe('pdfExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getImageProperties.mockReturnValue({ width: 794, height: 1000 });
  });

  it('downloads on web and sanitizes the file name', async () => {
    isNativePlatform.mockReturnValue(false);
    const el = document.createElement('div');

    const result = await exportElementToPdf(el, 'Jane Doe / CV');

    expect(result).toEqual({ method: 'download', fileName: 'Jane_Doe_CV.pdf' });
    expect(save).toHaveBeenCalledWith('Jane_Doe_CV.pdf');
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('paginates tall content across multiple A4 pages', async () => {
    isNativePlatform.mockReturnValue(false);
    // 794x3000 → ~3.8 A4 pages tall.
    getImageProperties.mockReturnValue({ width: 794, height: 3000 });

    await exportElementToPdf(document.createElement('div'), 'tall');

    // First page is the initial addImage; each addPage adds one more.
    expect(addPage.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(addImage.mock.calls.length).toBe(addPage.mock.calls.length + 1);
  });

  it('writes to the filesystem and opens the share sheet on native', async () => {
    isNativePlatform.mockReturnValue(true);
    const el = document.createElement('div');

    const result = await exportElementToPdf(el, 'My CV.pdf');

    expect(result).toEqual({ method: 'share', fileName: 'My_CV.pdf' });
    expect(writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'My_CV.pdf', data: 'QUJD', directory: 'CACHE' })
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///cache/My_CV.pdf' })
    );
    expect(save).not.toHaveBeenCalled();
  });
});

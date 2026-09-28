import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { logger } from '@/lib/logger';

/**
 * Renders a resume/CV preview DOM node to a real PDF file.
 *
 * Web: triggers a browser download.
 * Native (Capacitor): writes the file to the cache directory and opens the OS
 * share sheet, since a WebView has no print/save dialog.
 *
 * The node must be laid out (not `display:none`); callers render it off-screen
 * at a fixed width so capture is deterministic across view modes.
 */

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export type PdfExportMethod = 'download' | 'share';

export interface PdfExportResult {
  method: PdfExportMethod;
  fileName: string;
}

function toPdfFileName(base: string): string {
  const cleaned = base
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${cleaned || 'resume'}.pdf`;
}

async function renderToPdf(element: HTMLElement): Promise<jsPDF> {
  // html-to-image (SVG foreignObject) handles modern CSS colors (oklch/lab)
  // that html2canvas cannot; it is already the repo's rasterizer (ShareModal).
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const { width, height } = pdf.getImageProperties(dataUrl);
  const renderWidth = A4_WIDTH_PT;
  const renderHeight = (height / width) * renderWidth;

  // Slice the tall capture across A4 pages by shifting the same image up.
  let heightLeft = renderHeight;
  let position = 0;
  pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
  heightLeft -= A4_HEIGHT_PT;
  while (heightLeft > 0) {
    position -= A4_HEIGHT_PT;
    pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', 0, position, renderWidth, renderHeight);
    heightLeft -= A4_HEIGHT_PT;
  }
  return pdf;
}

export async function exportElementToPdf(
  element: HTMLElement,
  fileNameBase: string
): Promise<PdfExportResult> {
  const fileName = toPdfFileName(fileNameBase);
  const pdf = await renderToPdf(element);

  if (Capacitor.isNativePlatform()) {
    const base64 = pdf.output('datauristring').split(',')[1];
    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: fileName, url: written.uri });
    logger.info('Exported PDF via native share:', fileName);
    return { method: 'share', fileName };
  }

  pdf.save(fileName);
  logger.info('Exported PDF via browser download:', fileName);
  return { method: 'download', fileName };
}

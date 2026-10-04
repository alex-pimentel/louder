import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export interface PdfProgress {
  page: number;
  total: number;
}

export interface ExtractPdfOptions {
  onProgress?: (progress: PdfProgress) => void;
}

export async function extractPdfText(file: File, options: ExtractPdfOptions = {}): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`PDF maior que ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB.`);
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data });
  const documentProxy = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= documentProxy.numPages; pageNumber += 1) {
      options.onProgress?.({ page: pageNumber, total: documentProxy.numPages });
      const page = await documentProxy.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : " "))
        .join(" ")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
      pages.push(text);
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

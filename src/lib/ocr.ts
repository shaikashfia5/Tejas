/**
 * Client-side OCR using Tesseract.js
 * Runs entirely in the browser — no server dependency.
 */
import { createWorker } from 'tesseract.js';

export async function extractText(imageFile: File): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(imageFile);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract text from an image URL (e.g., blob URL or data URL)
 */
export async function extractTextFromUrl(imageUrl: string): Promise<string> {
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(imageUrl);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

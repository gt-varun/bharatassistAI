import pdfParse from 'pdf-parse';
import { logger } from '../../utils/logger.js';

const FETCH_TIMEOUT_MS = 15000;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — a gazette PDF or notification page, not a video.

export interface FetchedSource {
  url: string;
  contentType: string;
  /** Plain text, stripped of markup — what the extractor actually reads. */
  text: string;
}

/** Removes tags/scripts/styles and collapses whitespace, without pulling in a DOM library. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches one monitored source and returns it as plain text, whether the
 * page was HTML or a linked PDF notification. Never throws — a source that
 * is unreachable, blocks bots, or times out is a transient failure the
 * pipeline should retry next run, not a reason to crash the whole batch.
 */
export async function fetchSourceContent(url: string): Promise<FetchedSource | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A plain identifying UA — this is a declared monitoring pipeline
        // fetching a public notification page, not evading detection.
        'User-Agent': 'BharatAssistAI-KnowledgeUpdateBot/1.0 (+government scheme monitoring)'
      }
    });

    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'Knowledge Update: source fetch failed');
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      logger.warn({ url, bytes: buffer.byteLength }, 'Knowledge Update: source too large, skipping');
      return null;
    }

    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      try {
        const parsed = await pdfParse(buffer);
        return { url, contentType: 'application/pdf', text: parsed.text.replace(/\s+/g, ' ').trim() };
      } catch (err) {
        logger.warn({ url, err }, 'Knowledge Update: PDF parse failed');
        return null;
      }
    }

    const html = buffer.toString('utf-8');
    const text = htmlToText(html);
    return { url, contentType: contentType || 'text/html', text };
  } catch (err) {
    logger.warn({ url, err }, 'Knowledge Update: source unreachable');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

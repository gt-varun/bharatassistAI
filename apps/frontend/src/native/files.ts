import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './platform';

/**
 * Getting a file out of the app.
 *
 * On the web this is a Blob and an anchor with `download`, which is what
 * the product already did and what still happens in every browser. Inside
 * an Android WebView that pair does nothing at all: `download` is not
 * implemented, `blob:` URLs are not navigable, and the citizen taps
 * "Download my data" and receives silence. Since a DPDP export the user
 * cannot obtain is not an export, the native path writes a real file to
 * the app's documents directory and hands it to the system share sheet.
 *
 * The web behaviour below is byte-for-byte the original implementation;
 * only the native branch is new.
 */

/** Ask the browser to save `contents` as `filename`. */
function saveInBrowser(filename: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Save a text file and, on a phone, offer it to the share sheet so it can
 * be filed, mailed or opened in another app.
 *
 * Resolves once the file is on its way. Throws only if the file could not
 * be written — a share sheet the citizen dismisses is a normal outcome,
 * not a failure.
 */
export async function saveTextFile(
  filename: string,
  contents: string,
  options: { mimeType?: string; dialogTitle?: string } = {}
): Promise<void> {
  const mimeType = options.mimeType ?? 'application/json';

  if (!isNative()) {
    saveInBrowser(filename, contents, mimeType);
    return;
  }

  const written = await Filesystem.writeFile({
    path: filename,
    data: contents,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true
  });

  try {
    await Share.share({
      title: options.dialogTitle ?? filename,
      files: [written.uri]
    });
  } catch {
    // Dismissing the sheet rejects. The file is written either way, and
    // the caller has already been told where it lives.
  }
}

/**
 * Put a page in front of the citizen on paper — or, on a phone, wherever
 * they want it.
 *
 * `window.print()` is a no-op in an Android WebView, so a "Print" button
 * there is a dead control. Rather than remove the ability to take the list
 * away with you, the native path shares it as text, which reaches the same
 * destinations a phone actually has: a printing app, a chat, a note, mail.
 */
export async function printOrShare(payload: {
  title: string;
  text: string;
}): Promise<void> {
  if (!isNative()) {
    window.print();
    return;
  }

  try {
    await Share.share({
      title: payload.title,
      text: payload.text,
      dialogTitle: payload.title
    });
  } catch {
    /* Dismissed. */
  }
}

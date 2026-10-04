/** Browser-only: fetch a file with auth headers (an <a href> can't send them) and save it. */
export async function downloadWithHeaders(url: string, headers: HeadersInit, fallbackName: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return json?.error || 'Download failed.';
    }
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return null;
  } catch {
    return 'Network error — download failed.';
  }
}

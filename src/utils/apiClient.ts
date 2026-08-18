/**
 * Safe fetch utility that gracefully handles non-JSON responses,
 * HTML error pages, rate limit plain text ("Rate exceeded."),
 * and network dropouts.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isRateLimited?: boolean;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    
    // Check if response is not ok
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 429) {
        console.warn(`[API] Rate limit encountered on ${url}, backing off gracefully.`);
        return null;
      }
      
      if (contentType.includes('application/json')) {
        const errJson = await res.json().catch(() => null);
        console.warn(`[API] Server responded with error status ${res.status} on ${url}:`, errJson);
        return errJson as T;
      } else {
        const text = await res.text().catch(() => '');
        console.warn(`[API] Server responded with status ${res.status} (${text.substring(0, 100)}) on ${url}`);
        return null;
      }
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          return JSON.parse(text) as T;
        } catch {
          return null;
        }
      }
      return null;
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] Network or parsing note on ${url}:`, err?.message || err);
    return null;
  }
}

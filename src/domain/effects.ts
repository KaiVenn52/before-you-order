// Native side effects are injectable so failure paths can be exercised without a phone.
export async function ignoreFailure(effect: () => Promise<unknown>): Promise<void> {
  try { await effect(); } catch { /* Optional haptics must never block an action. */ }
}

export async function openExternalUrl(url: string, open: (url: string) => Promise<unknown>, onError: () => void): Promise<boolean> {
  return openFirstExternalUrl([url], open, onError);
}

export async function openFirstExternalUrl(urls: string[], open: (url: string) => Promise<unknown>, onError: () => void): Promise<boolean> {
  const safeUrls = urls.filter(url => /^(https:\/\/|geo:)/i.test(url));
  for (const url of safeUrls) {
    try {
      await open(url);
      return true;
    } catch { /* Try the next safe target before showing an error. */ }
  }
  try { onError(); } catch { /* Error UI is best-effort too. */ }
  return false;
}

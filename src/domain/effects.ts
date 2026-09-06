// Native side effects are injectable so failure paths can be exercised without a phone.
export async function ignoreFailure(effect: () => Promise<unknown>): Promise<void> {
  try { await effect(); } catch { /* Optional haptics must never block an action. */ }
}

export async function openExternalUrl(url: string, open: (url: string) => Promise<unknown>, onError: () => void): Promise<boolean> {
  try {
    if (!/^https:\/\//i.test(url)) throw new Error('Unsupported external URL');
    await open(url);
    return true;
  } catch {
    onError();
    return false;
  }
}

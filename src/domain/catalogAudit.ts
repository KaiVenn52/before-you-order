export interface ImageCredit {
  mealId: string; sourceTitle: string; artist: string; license: string; sourceUrl: string; licenseUrl: string;
  modifications: string[];
  attributionStatus: string;
  attributionNote?: string;
  isPlaceholder?: boolean;
}

export function isExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function auditCredits(credits: readonly ImageCredit[], mealIds: readonly string[]) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const external = new Map<string, string[]>();
  for (const credit of credits) {
    if (seen.has(credit.mealId)) errors.push(`${credit.mealId}: duplicate credit`);
    seen.add(credit.mealId);
    const expectedChanges = credit.isPlaceholder
      ? ['original-artwork']
      : credit.license === 'Original artwork'
        ? ['ai-generated', 'crop', 'resize', 'webp-conversion']
        : ['crop', 'resize', 'webp-conversion'];
    if (JSON.stringify(credit.modifications) !== JSON.stringify(expectedChanges)) errors.push(`${credit.mealId}: missing or invalid processing record`);
    if (!['original', 'imported', 'source-checked', 'self-published', 'source-assumed'].includes(credit.attributionStatus)) errors.push(`${credit.mealId}: invalid attribution status`);
    if (/Wikimedia.*contributor|machine-readable|^unknown$/i.test(credit.artist)) errors.push(`${credit.mealId}: unresolved generic artist`);
    if (['self-published', 'source-assumed'].includes(credit.attributionStatus) && !credit.attributionNote?.trim()) errors.push(`${credit.mealId}: attribution qualification missing`);
    if (!mealIds.includes(credit.mealId)) errors.push(`${credit.mealId}: unknown meal`);
    if (!credit.artist.trim() || credit.artist.length > 180 || /<[^>]+>/.test(credit.artist)) errors.push(`${credit.mealId}: invalid artist`);
    if (!/^(CC0(?: 1\.0)?|CC BY(?:-SA)? \d\.\d(?: [a-z]{2})?|Public domain|Original artwork)$/.test(credit.license)) errors.push(`${credit.mealId}: unsupported license`);
    if (credit.license === 'Original artwork') {
      if (credit.sourceUrl || credit.licenseUrl) errors.push(`${credit.mealId}: original image should not open external links`);
    } else {
      if (!isExternalUrl(credit.sourceUrl) || !isExternalUrl(credit.licenseUrl)) errors.push(`${credit.mealId}: missing or invalid attribution URLs`);
      let decoded = credit.sourceUrl;
      try { decoded = decodeURIComponent(decoded); } catch { errors.push(`${credit.mealId}: malformed source URL encoding`); }
      const key = decoded.replace(/_/g, ' ').normalize('NFC');
      external.set(key, [...(external.get(key) ?? []), credit.mealId]);
    }
  }
  for (const id of mealIds) if (!seen.has(id)) errors.push(`${id}: missing credit`);
  return { errors, duplicates: [...external].filter(([, ids]) => ids.length > 1).map(([sourceUrl, mealIds]) => ({ sourceUrl, mealIds })) };
}

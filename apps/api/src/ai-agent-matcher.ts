import { AiAgentMatchType } from '@prisma/client';

export function matchesAgentKeyword(text: string, keywords: string[], matchType: AiAgentMatchType, caseSensitive = false) {
  const source = caseSensitive ? text.trim() : text.trim().toLocaleLowerCase('id-ID');
  return keywords.some((rawKeyword) => {
    const normalized = rawKeyword.trim();
    if (!normalized) return false;
    const keyword = caseSensitive ? normalized : normalized.toLocaleLowerCase('id-ID');
    if (matchType === AiAgentMatchType.EXACT) return source === keyword;
    if (matchType === AiAgentMatchType.CONTAINS) return source.includes(keyword);
    if (keyword.length > 256) return false;
    try { return new RegExp(normalized, caseSensitive ? '' : 'i').test(text.trim()); }
    catch { return false; }
  });
}

export function canonicalAgentTarget(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith('@g.us')) return normalized;
  const digits = normalized.replace(/@(?:c\.us|s\.whatsapp\.net|lid)$/i, '').replace(/\D/g, '');
  return digits || normalized;
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return named[code.toLowerCase()] ?? entity;
  });
}

export function htmlToWhatsApp(value: string) {
  const source = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!/<[a-z][\s\S]*>/i.test(source)) return decodeHtmlEntities(source).trim();
  return decodeHtmlEntities(
    source
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<\/(div|p|li|h[1-6]|blockquote|tr)>/gi, '\n')
      .replace(/<(b|strong)\b[^>]*>/gi, '*')
      .replace(/<\/(b|strong)>/gi, '*')
      .replace(/<(i|em)\b[^>]*>/gi, '_')
      .replace(/<\/(i|em)>/gi, '_')
      .replace(/<(s|strike|del)\b[^>]*>/gi, '~')
      .replace(/<\/(s|strike|del)>/gi, '~')
      .replace(/<code\b[^>]*>/gi, '`')
      .replace(/<\/code>/gi, '`')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\{\s*([*_~`])\s*\{\s*([a-z0-9_ -]+)\s*\}\s*\}\s*\1?/gi, '$1{{$2}}$1')
    .replace(/([*_~`]){2,}/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

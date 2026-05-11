export function sanitizeTerminalText(value: string): string {
  return value.replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, (ch) => {
    const code = ch.charCodeAt(0).toString(16).padStart(2, '0');
    return `\\x${code}`;
  });
}

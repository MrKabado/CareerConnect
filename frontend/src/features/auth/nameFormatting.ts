export function toNameCase(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/(^|\s|[.'-])([a-z])/gi, (_match, separator: string, letter: string) =>
      `${separator}${letter.toLocaleUpperCase()}`,
    );
}

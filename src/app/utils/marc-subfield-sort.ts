export function compareSubfieldCodes(a: string, b: string): number {
  const aIsLetter = /^[a-zA-Z]$/.test(a);
  const bIsLetter = /^[a-zA-Z]$/.test(b);
  const aIsDigit = /^\d$/.test(a);
  const bIsDigit = /^\d$/.test(b);

  if (aIsLetter && bIsDigit) return -1;
  if (aIsDigit && bIsLetter) return 1;

  if (aIsLetter && bIsLetter) {
    return a.localeCompare(b);
  }

  if (aIsDigit && bIsDigit) {
    return Number(b) - Number(a);
  }

  return a.localeCompare(b);
}

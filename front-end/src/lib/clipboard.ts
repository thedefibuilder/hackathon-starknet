export const isClipboardApiSupported = !!navigator.clipboard?.writeText;

export async function copyToClipboard(address: string) {
  await navigator.clipboard.writeText(address);
}

export const isClipboardApiSupported = !!navigator.clipboard?.writeText;

export async function onCopyAddressClick(address: string) {
  await navigator.clipboard.writeText(address);
}

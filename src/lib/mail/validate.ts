export {
  CID,
  extensionForMime,
  isValidEmail,
  MAX_IMAGE_BYTES,
  MAX_WIDTH_RECOMMENDED,
  sniffImageMime,
} from "./shared";

export function decodeBase64(data: string): Uint8Array {
  return Uint8Array.from(Buffer.from(data, "base64"));
}

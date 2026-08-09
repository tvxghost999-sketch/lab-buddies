/**
 * Browser-Native End-to-End Encryption (E2EE) Module
 * Uses standard Web Crypto API: PBKDF2 for key derivation and AES-256-GCM for authenticated encryption.
 */

const SALT_PREFIX = 'lab-buddies-e2ee-salt-';
const ENC_PREFIX = 'ENC:';

/**
 * Derives a 256-bit AES-GCM CryptoKey from the Room PIN and optional password.
 */
export async function deriveRoomKey(pin: string, password?: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretMaterial = `${pin.trim()}:${(password || '').trim()}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretMaterial),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = encoder.encode(`${SALT_PREFIX}${pin.trim()}`);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a fresh random 96-bit IV.
 * Output format: "ENC:<iv_hex>:<ciphertext_hex>"
 */
export async function encryptText(plainText: string, key?: CryptoKey | null): Promise<string> {
  if (!plainText || !key) return plainText;

  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for GCM
    const data = encoder.encode(plainText);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const ivHex = Array.from(iv).map((b) => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(encryptedBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${ENC_PREFIX}${ivHex}:${cipherHex}`;
  } catch (err) {
    console.error('[E2EE] Encryption failed:', err);
    return plainText;
  }
}

/**
 * Decrypts a ciphertext payload formatted as "ENC:<iv_hex>:<ciphertext_hex>".
 * If the string is unencrypted, returns the original plaintext unchanged.
 */
export async function decryptText(cipherPayload: string, key?: CryptoKey | null): Promise<string> {
  if (!cipherPayload || typeof cipherPayload !== 'string') return cipherPayload;
  if (!cipherPayload.startsWith(ENC_PREFIX) || !key) {
    return cipherPayload;
  }

  try {
    const raw = cipherPayload.slice(ENC_PREFIX.length);
    const [ivHex, cipherHex] = raw.split(':');
    if (!ivHex || !cipherHex) return cipherPayload;

    const ivBytes = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      cipherBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    // If decryption fails (e.g. key mismatch), return original string or safe fallback
    return cipherPayload;
  }
}

/**
 * Encrypts dynamic feed item fields (content and code)
 */
export async function encryptFeedItem<T extends { content?: string; code?: string }>(
  item: T,
  key?: CryptoKey | null
): Promise<T> {
  if (!key) return item;
  const clone = { ...item };
  if (clone.content) clone.content = await encryptText(clone.content, key);
  if (clone.code) clone.code = await encryptText(clone.code, key);
  return clone;
}

/**
 * Decrypts dynamic feed item fields (content and code)
 */
export async function decryptFeedItem<T extends { content?: string; code?: string }>(
  item: T,
  key?: CryptoKey | null
): Promise<T> {
  if (!key) return item;
  const clone = { ...item };
  if (clone.content) clone.content = await decryptText(clone.content, key);
  if (clone.code) clone.code = await decryptText(clone.code, key);
  return clone;
}

/**
 * Encrypts note fields (title and content)
 */
export async function encryptNote<T extends { title?: string; content?: string }>(
  note: T,
  key?: CryptoKey | null
): Promise<T> {
  if (!key) return note;
  const clone = { ...note };
  if (clone.title) clone.title = await encryptText(clone.title, key);
  if (clone.content) clone.content = await encryptText(clone.content, key);
  return clone;
}

/**
 * Decrypts note fields (title and content)
 */
export async function decryptNote<T extends { title?: string; content?: string }>(
  note: T,
  key?: CryptoKey | null
): Promise<T> {
  if (!key) return note;
  const clone = { ...note };
  if (clone.title) clone.title = await decryptText(clone.title, key);
  if (clone.content) clone.content = await decryptText(clone.content, key);
  return clone;
}

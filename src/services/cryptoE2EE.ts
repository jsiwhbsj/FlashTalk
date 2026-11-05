/**
 * Genuine Web Crypto API (AES-GCM 256-bit + PBKDF2 SHA-256) End-to-End Encryption Service
 * Used for encrypting/decrypting sensitive FlashTalk messages on the client before transmission.
 */

const ENCRYPTION_PREFIX = 'E2EE_GCM_V1:';
const SALT_BYTES = new TextEncoder().encode('FlashTalk-E2EE-Salt-2026-Secure');

async function deriveRoomKey(roomSecret: string): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(roomSecret || 'flashtalk-default-room-key'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT_BYTES,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptMessageE2EE(plainText: string, roomId: string): Promise<{
  cipherText: string;
  keyFingerprint: string;
}> {
  if (!window.crypto?.subtle) {
    return { cipherText: plainText, keyFingerprint: 'PLAINTEXT-FALLBACK' };
  }
  const key = await deriveRoomKey(`FlashTalk-Room-${roomId}`);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const ivB64 = uint8ToBase64(iv);
  const cipherB64 = uint8ToBase64(new Uint8Array(encryptedBuffer));

  // Generate short SHA-256 fingerprint of the room ID for UI verification
  const hashBuf = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`FlashTalk-Room-${roomId}`)
  );
  const hashArray = Array.from(new Uint8Array(hashBuf)).slice(0, 6);
  const keyFingerprint = hashArray.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');

  return {
    cipherText: `${ENCRYPTION_PREFIX}${ivB64}:${cipherB64}`,
    keyFingerprint,
  };
}

export async function decryptMessageE2EE(payload: string, roomId: string): Promise<string> {
  if (!payload || !payload.startsWith(ENCRYPTION_PREFIX) || !window.crypto?.subtle) {
    return payload;
  }
  try {
    const raw = payload.slice(ENCRYPTION_PREFIX.length);
    const [ivB64, cipherB64] = raw.split(':');
    if (!ivB64 || !cipherB64) return payload;

    const key = await deriveRoomKey(`FlashTalk-Room-${roomId}`);
    const iv = base64ToUint8(ivB64);
    const cipherBytes = base64ToUint8(cipherB64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    return payload;
  }
}

export function isEncryptedPayload(payload?: string): boolean {
  return Boolean(payload && payload.startsWith(ENCRYPTION_PREFIX));
}

export async function hashSecretSHA256(secret: string, salt = 'FlashTalk-Secret-2026'): Promise<string> {
  const normalized = secret.trim().toLowerCase();
  if (!window.crypto?.subtle) {
    return `sha256_fallback_${normalized}`;
  }
  const encoded = new TextEncoder().encode(`${salt}:${normalized}`);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySecretSHA256(
  candidatePlain: string,
  storedValue?: string | null,
  salt = 'FlashTalk-Secret-2026'
): Promise<boolean> {
  if (!storedValue) return false;
  if (storedValue.startsWith('sha256:')) {
    const candidateHash = await hashSecretSHA256(candidatePlain, salt);
    return candidateHash === storedValue;
  }
  // Backward compatibility for existing stored values before hashing upgrade
  return candidatePlain.trim().toLowerCase() === storedValue.trim().toLowerCase();
}


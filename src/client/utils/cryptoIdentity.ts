/**
 * Forensic-grade Cryptographic Identity Utility for Public Guest Contributors.
 * Bypasses passwords, using native browser Web Crypto API for ECDSA P-256 signing.
 */

interface GuestIdentity {
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyBase64: string;
}

const STORAGE_KEY = 'epstein_archive_guest_identity';

/**
 * ArrayBuffer helper to translate raw signature bytes to a base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Gets or dynamically generates the client-side cryptographic identity.
 */
export async function getOrCreateIdentity(): Promise<GuestIdentity> {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.privateJwk && parsed.publicJwk && parsed.publicKeyBase64) {
        const privateKey = await window.crypto.subtle.importKey(
          'jwk',
          parsed.privateJwk,
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign'],
        );
        const publicKey = await window.crypto.subtle.importKey(
          'jwk',
          parsed.publicJwk,
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['verify'],
        );
        return {
          privateKey,
          publicKey,
          publicKeyBase64: parsed.publicKeyBase64,
        };
      }
    } catch (e) {
      console.warn(
        '[CryptoIdentity] Failed to load cached identity keypair. Generating a fresh one.',
        e,
      );
    }
  }

  // 1. Generate new ECDSA P-256 Keypair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true, // Extractable
    ['sign', 'verify'],
  );

  // 2. Export Public Key in SPKI DER binary format to send to Server
  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = arrayBufferToBase64(spkiBuffer);

  // 3. Export both keys to serializable JWK (JSON Web Key) format for localStorage
  const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      privateJwk,
      publicJwk,
      publicKeyBase64,
    }),
  );

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyBase64,
  };
}

/**
 * Signs an API request payload using the locally stored keypair.
 * Returns both signature and public key to be attached in custom headers.
 */
export async function signRequestPayload(
  method: string,
  path: string,
  body: string,
): Promise<{ signature: string; publicKey: string }> {
  const { privateKey, publicKeyBase64 } = await getOrCreateIdentity();

  const formattedMethod = method.toUpperCase();
  const message = `${formattedMethod}:${path}:${body || ''}`;

  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);

  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    messageBytes,
  );

  const signature = arrayBufferToBase64(signatureBuffer);

  return {
    signature,
    publicKey: publicKeyBase64,
  };
}

/**
 * Generates and stores a WebAuthn-like passkey for a specific investigator/admin user.
 */
export async function createUserPasskey(
  userId: string,
): Promise<{ credentialId: string; publicKey: string }> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify'],
  );

  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKey = arrayBufferToBase64(spkiBuffer);

  const privateJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);

  const credentialId = window.crypto.randomUUID
    ? window.crypto.randomUUID()
    : Math.random().toString(36).substring(2);

  localStorage.setItem(
    `epstein_archive_passkey_${userId}_${credentialId}`,
    JSON.stringify({
      privateJwk,
      publicJwk,
      publicKey,
    }),
  );

  const credsKey = `epstein_archive_user_credentials_${userId}`;
  const existingCreds = JSON.parse(localStorage.getItem(credsKey) || '[]');
  existingCreds.push(credentialId);
  localStorage.setItem(credsKey, JSON.stringify(existingCreds));

  return {
    credentialId,
    publicKey,
  };
}

/**
 * Signs a login challenge for a registered investigator/admin passkey.
 */
export async function signLoginChallenge(
  userId: string,
  credentialId: string,
  challenge: string,
): Promise<string> {
  const stored = localStorage.getItem(`epstein_archive_passkey_${userId}_${credentialId}`);
  if (!stored) {
    throw new Error('Local credential key not found on this device');
  }

  const parsed = JSON.parse(stored);
  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    parsed.privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign'],
  );

  const encoder = new TextEncoder();
  const challengeBytes = encoder.encode(challenge);

  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    challengeBytes,
  );

  return arrayBufferToBase64(signatureBuffer);
}

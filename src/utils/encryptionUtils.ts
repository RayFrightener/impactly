"use client";
// Generates a random salt (Uint8Array) and returns it as a base64 string
export function generateSalt(length = 16): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...salt));
}

// Derives a CryptoKey from password and base64 salt using PBKDF2
export async function deriveKey(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypts plain text using AES-GCM and returns base64 ciphertext + IV
export async function encryptWithKey(
  key: CryptoKey,
  plainText: string
): Promise<{ cipherText: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plainText)
  );
  return {
    cipherText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypts base64 ciphertext using AES-GCM and returns plain text
export async function decryptWithKey(
  key: CryptoKey,
  cipherText: string,
  iv: string
): Promise<string> {
  const dec = new TextDecoder();
  const encryptedBytes = Uint8Array.from(atob(cipherText), (c) =>
    c.charCodeAt(0)
  );
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );
  return dec.decode(decrypted);
}

# End-to-End Encryption for Teebot Flow Backups

This document summarizes the E2E encryption design used for backups and provides recommended code snippets and best practices.

## Goal
- Ensure backups uploaded to the cloud are encrypted end-to-end so the server cannot decrypt them. Only the user's desktop client (who holds the recovery key) can decrypt backups.

## High-level design
- Algorithm: AES-256-GCM for authenticated encryption (confidentiality + integrity).
- Key material: a user-generated / client-generated **recovery key**. This is the only secret required to decrypt backups.
- Transport/auth: uploads and downloads are authenticated with a server-issued `businessJwt` (sent in `Authorization: Bearer <token>`). The `businessJwt` authenticates the business but cannot decrypt backups.
- Compression: backups are gzipped before upload (use `fflate`) to reduce transfer size.

## Recovery key lifecycle
- Generated on-device and presented to the user to save (Tauri save dialog). The app persists it to desktop-only storage via `saveRecoveryKey()` in `src/utils/recoveryKeyStore.ts`.
- Never upload or transmit the recovery key to the server.
- If the recovery key is lost, encrypted backups cannot be recovered.

## File / metadata format (recommended)
- Wrap backup payload in a small JSON metadata header (plaintext) and the ciphertext blob; example metadata:

```json
{
  "version": "1",
  "kdf": { "name": "PBKDF2", "salt": "<base64>", "iterations": 200000 },
  "cipher": { "alg": "AES-GCM", "iv": "<base64>", "tagLength": 128 },
  "appVersion": "0.0.5"
}
```

- The actual stored file may be `metadata.json` + binary ciphertext; or a single binary format that prefixes the metadata length.

## Key derivation (recommended)
- Derive a 256-bit AES key from the human-readable recovery key using a strong KDF.
- Recommended: Argon2 or scrypt when available. PBKDF2 is acceptable if you use high iterations and a per-backup salt.

## Example TypeScript snippets (Web Crypto + fflate)
Note: these are compact examples; adapt error handling and platform-specific I/O as needed.

```ts
// Derive AES-GCM key from recovery key using PBKDF2
async function deriveKeyPBKDF2(recoveryKey: string, salt: Uint8Array, iterations = 200000) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(recoveryKey), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext ArrayBuffer -> returns { salt, iv, ciphertext }
async function encryptBackupPlain(plain: ArrayBuffer, recoveryKey: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const key = await deriveKeyPBKDF2(recoveryKey, salt);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { salt: Buffer.from(salt).toString('base64'), iv: Buffer.from(iv).toString('base64'), ciphertext: new Uint8Array(cipher) };
}

// Decrypt: takes base64 salt/iv and ciphertext Uint8Array
async function decryptBackup(ciphertext: Uint8Array, recoveryKey: string, saltB64: string, ivB64: string) {
  const salt = Uint8Array.from(Buffer.from(saltB64, 'base64'));
  const iv = Uint8Array.from(Buffer.from(ivB64, 'base64'));
  const key = await deriveKeyPBKDF2(recoveryKey, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext.buffer);
  return new Uint8Array(plain);
}
```

```ts
// Gzip then upload (client-side)
import axios from 'axios';
import { gzipSync } from 'fflate';

async function uploadEncryptedBackup(ciphertextBytes: Uint8Array, businessJwt: string) {
  const gz = gzipSync(ciphertextBytes);
  const fd = new FormData();
  fd.append('backup', new Blob([gz], { type: 'application/gzip' }), 'teebot-backup.tbf.gz');
  const res = await axios.post('/api/teebot-flow/upload-backup', fd, {
    headers: { Authorization: `Bearer ${businessJwt}`, 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}
```

```ts
// Download: GET -> gunzip -> decrypt -> restore
import { gunzipSync } from 'fflate';
const res = await axios.get(`/api/teebot-flow/download-backup/${businessId}`, { responseType: 'blob' });
const gzBytes = new Uint8Array(await res.data.arrayBuffer());
const decryptedGzip = gunzipSync(gzBytes); // Uint8Array
// Parse metadata + ciphertext according to your chosen file layout
// Then call decryptBackup(...) with stored salt/iv and recovery key
```

## Best practices & notes
- Always use a fresh random IV per encryption (96-bit recommended) and store it with metadata.
- Store KDF parameters (salt, iterations) in metadata so you can change KDF parameters in future releases.
- Verify AES-GCM authentication tag — `crypto.subtle.decrypt` will fail if the tag is invalid.
- Consider Argon2/scrypt for stronger resistance to brute-force compared to PBKDF2.
- Keep the recovery key in desktop-only storage (`saveRecoveryKey()`), encourage the user to back it up externally (print/save file), and warn about permanent data loss if the key is lost.
- `businessJwt` is only for authorization; rotate it periodically and handle 401 'Session Expired' gracefully (client already clears JWT and prompts Cloud Sync).

## UX recommendations
- Show a one-time prompt to save the recovery key (Tauri save dialog) during setup and block encrypted backups until saved.
- Show a clear warning if a restore fails due to an invalid recovery key (auth tag failure).

## Appendix: metadata versioning strategy
- Start with `version: "1"` in metadata. If you change KDF or cipher choices in the future, increment `version` and keep migration code to detect and handle old formats.

---
Stored in: `docs/e2e-encryption.md`

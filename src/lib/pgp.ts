// PGP utilities — wraps openpgp.js for the Vault feature
import * as openpgp from "openpgp";

export interface PgpKeyInfo {
  fingerprint: string;
  keyId: string;
  userIds: string[];
  algorithm: string;
  bits: number;
  createdAt: Date | null;
}

export async function parsePublicKey(armored: string): Promise<PgpKeyInfo> {
  const key = await openpgp.readKey({ armoredKey: armored.trim() });
  const fingerprintHex = key.getFingerprint().toUpperCase();
  const keyId = key.getKeyID().toHex().toUpperCase();
  const userIds = key.getUserIDs();
  const primary = key.keyPacket;
  const algo = primary.algorithm || "unknown";
  let bits = 0;
  try {
    bits = (await key.getAlgorithmInfo()).bits ?? 0;
  } catch {
    bits = 0;
  }
  return {
    fingerprint: fingerprintHex,
    keyId,
    userIds,
    algorithm: String(algo),
    bits,
    createdAt: key.getCreationTime() || null,
  };
}

export function formatFingerprint(fp: string): string {
  // Group every 4 chars: ABCD EFGH ...
  return fp.replace(/(.{4})/g, "$1 ").trim();
}

export async function encryptForRecipient(plaintext: string, armoredPublicKey: string): Promise<string> {
  const publicKey = await openpgp.readKey({ armoredKey: armoredPublicKey.trim() });
  const message = await openpgp.createMessage({ text: plaintext });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys: publicKey,
    format: "armored",
  });
  return encrypted as string;
}

export async function encryptForRecipients(plaintext: string, armoredPublicKeys: string[]): Promise<string> {
  const encryptionKeys = await Promise.all(
    armoredPublicKeys.filter(Boolean).map((armoredKey) => openpgp.readKey({ armoredKey: armoredKey.trim() }))
  );
  const message = await openpgp.createMessage({ text: plaintext });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys,
    format: "armored",
  });
  return encrypted as string;
}

export async function generateKeyPair(name: string, email: string, passphrase: string) {
  const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
    type: "ecc",
    curve: "ed25519",
    userIDs: [{ name, email }],
    passphrase,
    format: "armored",
  });
  return { privateKey, publicKey, revocationCertificate };
}

export function isLikelyPgpPublicKey(text: string): boolean {
  return /-----BEGIN PGP PUBLIC KEY BLOCK-----/.test(text) && /-----END PGP PUBLIC KEY BLOCK-----/.test(text);
}

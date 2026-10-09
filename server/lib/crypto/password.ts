const ITERATIONS = 100000;
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;

// ──────────────────────────────────────────────────────────────
// Password Hashing Functions
// ──────────────────────────────────────────────────────────────

/**
 * Hash a password using PBKDF2 with a random salt.
 * Uses Web Crypto API for secure, platform-independent hashing.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a stored hash using constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, SALT_LENGTH);
    const hash = combined.slice(SALT_LENGTH);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      HASH_LENGTH * 8
    );

    const newHash = new Uint8Array(hashBuffer);

    if (hash.length !== newHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= hash[i] ^ newHash[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}

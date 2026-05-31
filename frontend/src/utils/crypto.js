import nacl from 'tweetnacl'
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util'

const PRIVATE_KEY_STORE = 'chatapp_private_key'

// ── Key management ────────────────────────────────────────────────────────────

export function savePrivateKey(privateKeyB64) {
  // Stored in localStorage — only safe because it's a personal device app.
  // For higher security, use a passphrase-encrypted export.
  localStorage.setItem(PRIVATE_KEY_STORE, privateKeyB64)
}

export function loadPrivateKey() {
  return localStorage.getItem(PRIVATE_KEY_STORE)
}

export function hasPrivateKey() {
  return !!localStorage.getItem(PRIVATE_KEY_STORE)
}

export function clearPrivateKey() {
  localStorage.removeItem(PRIVATE_KEY_STORE)
}

// ── Encrypt (sender side) ─────────────────────────────────────────────────────

export function encryptMessage(plaintext, senderPrivateB64, receiverPublicB64) {
  try {
    const senderPrivate  = decodeBase64(senderPrivateB64)
    const receiverPublic = decodeBase64(receiverPublicB64)
    const senderKeyPair  = nacl.box.keyPair.fromSecretKey(senderPrivate)
    const nonce          = nacl.randomBytes(nacl.box.nonceLength)
    const msgUint8       = encodeUTF8(plaintext)

    const encrypted = nacl.box(msgUint8, nonce, receiverPublic, senderKeyPair.secretKey)

    // Pack nonce + ciphertext together
    const full = new Uint8Array(nonce.length + encrypted.length)
    full.set(nonce)
    full.set(encrypted, nonce.length)

    return encodeBase64(full)
  } catch (err) {
    console.error('Encryption failed:', err)
    return plaintext   // fallback: send plaintext (only if keys not set up)
  }
}

// ── Decrypt (receiver side) ───────────────────────────────────────────────────

export function decryptMessage(ciphertextB64, receiverPrivateB64, senderPublicB64) {
  try {
    const fullMsg        = decodeBase64(ciphertextB64)
    const nonce          = fullMsg.slice(0, nacl.box.nonceLength)
    const ciphertext     = fullMsg.slice(nacl.box.nonceLength)
    const receiverPrivate= decodeBase64(receiverPrivateB64)
    const senderPublic   = decodeBase64(senderPublicB64)

    const decrypted = nacl.box.open(ciphertext, nonce, senderPublic, receiverPrivate)
    if (!decrypted) return '[encrypted message]'

    return new TextDecoder().decode(decrypted)
  } catch {
    return '[encrypted message]'
  }
}

// ── Check if a string looks like a ciphertext ─────────────────────────────────

export function isCiphertext(text) {
  if (!text || text.length < 40) return false
  // Base64 only — plaintext usually has spaces
  return /^[A-Za-z0-9+/=]+$/.test(text) && !text.includes(' ')
}
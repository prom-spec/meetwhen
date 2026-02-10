// API Key utilities for letsmeet.link MCP integration
import { createHash, randomBytes } from "node:crypto"

const API_KEY_PREFIX = "mk_"

export function generateApiKey(): { plainKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(32)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 43)

  const plainKey = `${API_KEY_PREFIX}${randomPart}`
  const keyHash = hashApiKey(plainKey)
  const keyPrefix = plainKey.substring(0, 8)

  return { plainKey, keyHash, keyPrefix }
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}...`
}

export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length > 10
}

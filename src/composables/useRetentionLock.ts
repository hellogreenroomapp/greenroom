import { computed, ref } from 'vue'
import { useBrandStore } from '@/stores/brand'
import { useBrand } from '@/composables/useBrand'
import { hashRetentionPassword } from '@/utils/retentionReports'

/**
 * Session unlock state for the password-protected Retention Reports section.
 *
 * The brand owner sets a password in Settings (stored as a salted SHA-256
 * hash on the brand doc). Viewers must enter it once per browser session;
 * the unlock token is the hash itself, so changing the password re-locks
 * everyone immediately.
 */

const STORAGE_PREFIX = 'retention-unlock-'

// Module-level so all components share the same unlock state
const unlockedHashes = ref<Record<string, string>>({})

function storageKey(brandId: string): string {
  return `${STORAGE_PREFIX}${brandId}`
}

function sessionToken(brandId: string): string | null {
  try {
    return sessionStorage.getItem(storageKey(brandId))
  } catch {
    return null
  }
}

export function useRetentionLock() {
  const brandStore = useBrandStore()
  const { updateBrand } = useBrand()

  const brandId = computed(() => brandStore.currentBrand?.id || '')
  const storedHash = computed(() => brandStore.currentBrand?.retentionPasswordHash || '')

  const isProtected = computed(() => storedHash.value.length > 0)

  const isUnlocked = computed(() => {
    if (!isProtected.value) return true
    if (!brandId.value) return false
    const token = unlockedHashes.value[brandId.value] ?? sessionToken(brandId.value)
    return token === storedHash.value
  })

  /** Try a password. Returns true and unlocks the session if it matches. */
  async function unlock(password: string): Promise<boolean> {
    if (!brandId.value || !isProtected.value) return true
    const hash = await hashRetentionPassword(brandId.value, password)
    if (hash !== storedHash.value) return false
    unlockedHashes.value = { ...unlockedHashes.value, [brandId.value]: hash }
    try {
      sessionStorage.setItem(storageKey(brandId.value), hash)
    } catch {
      // Session-only convenience; in-memory unlock already succeeded
    }
    return true
  }

  /** Owner: set or change the password. Unlocks the current session. */
  async function setPassword(password: string): Promise<void> {
    if (!brandId.value) throw new Error('No brand selected')
    const hash = await hashRetentionPassword(brandId.value, password)
    await updateBrand(brandId.value, { retentionPasswordHash: hash })
    unlockedHashes.value = { ...unlockedHashes.value, [brandId.value]: hash }
    try {
      sessionStorage.setItem(storageKey(brandId.value), hash)
    } catch {
      // Ignore storage failures
    }
  }

  /** Owner: remove the password so the section is open to all brand members. */
  async function removePassword(): Promise<void> {
    if (!brandId.value) throw new Error('No brand selected')
    await updateBrand(brandId.value, { retentionPasswordHash: '' })
    try {
      sessionStorage.removeItem(storageKey(brandId.value))
    } catch {
      // Ignore storage failures
    }
  }

  return { isProtected, isUnlocked, unlock, setPassword, removePassword }
}

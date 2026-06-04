import { ref, uploadBytes, getDownloadURL, deleteObject, getBlob } from 'firebase/storage'
import { storage } from './config'

/**
 * Upload an image file to Firebase Storage
 * @param file - The image file to upload
 * @param path - Storage path (e.g., 'products/{productId}/image.jpg' or 'moodboards/{projectId}/{imageId}.jpg')
 * @returns Promise resolving to the download URL
 */
export async function uploadImage(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error: any) {
    console.error('Error uploading image:', error)
    throw new Error(`Failed to upload image: ${error.message}`)
  }
}

/**
 * Delete an image from Firebase Storage
 * @param path - Storage path to the image
 */
export async function deleteImage(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  } catch (error: any) {
    console.error('Error deleting image:', error)
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}

/**
 * Get download URL for an image
 * @param path - Storage path to the image
 * @returns Promise resolving to the download URL
 */
export async function getImageUrl(path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    return await getDownloadURL(storageRef)
  } catch (error: any) {
    console.error('Error getting image URL:', error)
    throw new Error(`Failed to get image URL: ${error.message}`)
  }
}

/**
 * Extract storage path from a Firebase Storage URL
 * @param url - Full Firebase Storage URL
 * @returns Storage path or null if not a Firebase Storage URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    // Firebase Storage URLs have format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
    const match = url.match(/\/o\/([^?]+)/)
    if (match && match[1]) {
      return decodeURIComponent(match[1])
    }
    return null
  } catch {
    return null
  }
}

/**
 * Download file bytes via the Storage SDK (uses auth), avoiding browser CORS on the download URL.
 * Use for PDF/export when the URL is a Firebase Storage download link.
 */
export async function getBlobFromStorageDownloadUrl(url: string): Promise<Blob | null> {
  const path = extractStoragePath(url)
  if (!path) return null
  try {
    const storageRef = ref(storage, path)
    return await getBlob(storageRef)
  } catch (e) {
    console.warn('[storage] getBlob failed for path', path, e)
    return null
  }
}

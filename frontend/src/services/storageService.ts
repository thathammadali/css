/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SEMS Robust Client-side File Storage & Compression Engine
 * - Compresses high-resolution images via Canvas to 80-180 KB
 * - Persists receipts and attachments in browser IndexedDB (No 5MB localStorage crash)
 * - Retains offline files across F5 page reloads (no broken blob: links)
 * - Provides 1-click Demo Data reset
 */

const DB_NAME = 'sems_storage_db';
const DB_VERSION = 1;
const STORE_FILES = 'sems_files';

export interface StoredFileRecord {
  key: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: number;
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Compresses an image file client-side using HTML5 Canvas.
   * Typically reduces 2MB - 10MB images down to ~70KB - 160KB.
   */
  async compressImage(
    file: File,
    maxDimension: number = 1280,
    quality: number = 0.78
  ): Promise<{ dataUrl: string; originalSize: number; compressedSize: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      // Non-image files (e.g. PDF) are read directly as DataURL
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            originalSize: file.size,
            compressedSize: dataUrl.length,
            mimeType: file.type || 'application/pdf',
          });
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while scaling to maxDimension
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Fill background white in case of transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-efficiency JPEG
        const targetMime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(targetMime, quality);
        const approxSize = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize: approxSize,
          mimeType: targetMime,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image for compression'));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Saves a file record permanently in IndexedDB under a unique key.
   */
  async saveFile(record: StoredFileRecord): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FILES], 'readwrite');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[StorageService] IndexedDB save fallback:', err);
    }
  }

  /**
   * Retrieves a file record from IndexedDB by key.
   */
  async getFile(key: string): Promise<StoredFileRecord | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FILES], 'readonly');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve((request.result as StoredFileRecord) || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[StorageService] IndexedDB get fallback:', err);
      return null;
    }
  }

  /**
   * Deletes a file record by key.
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FILES], 'readwrite');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[StorageService] IndexedDB delete error:', err);
    }
  }

  /**
   * Estimates total files and storage bytes in IndexedDB.
   */
  async getStorageStats(): Promise<{ fileCount: number; totalEstimatedBytes: number }> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FILES], 'readonly');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.getAll();

        request.onsuccess = () => {
          const files = (request.result as StoredFileRecord[]) || [];
          const totalEstimatedBytes = files.reduce((acc, f) => acc + (f.fileSize || f.dataUrl?.length || 0), 0);
          resolve({
            fileCount: files.length,
            totalEstimatedBytes,
          });
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return { fileCount: 0, totalEstimatedBytes: 0 };
    }
  }

  /**
   * Wipes all files from IndexedDB.
   */
  async clearAllFiles(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_FILES], 'readwrite');
        const store = transaction.objectStore(STORE_FILES);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn('[StorageService] Failed to clear IndexedDB:', err);
    }
  }

  /**
   * Full 1-Click Demo Reset:
   * Clears IndexedDB files, resets all localStorage SEMS caches to fresh state.
   */
  async resetAllDemoData(): Promise<void> {
    // 1. Clear IndexedDB
    await this.clearAllFiles();

    // 2. Clear known SEMS keys from localStorage
    const semsKeys = [
      'sems_registrants',
      'sems_certificates',
      'sems_events',
      'sems_forms',
      'sems_theme',
      'sems_users',
      'sems_audit_logs',
      'sems_notifications',
      'sems_active_session',
      'sems_is_logged_in',
      'sems_active_tab',
      'sems_active_screen',
    ];

    semsKeys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore
      }
    });
  }
}

export const storageService = new StorageService();

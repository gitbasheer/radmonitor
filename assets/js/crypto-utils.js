/**
 * Simple crypto utilities for client-side encryption
 * Uses Web Crypto API for secure encryption/decryption
 */

class CryptoUtils {
    constructor() {
        // Generate or retrieve encryption key
        this.keyPromise = this.getOrCreateKey();
    }

    /**
     * Get or create encryption key stored in IndexedDB
     */
    async getOrCreateKey() {
        const dbName = 'RadMonitorCrypto';
        const storeName = 'keys';
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            
            request.onerror = () => reject(request.error);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            
            request.onsuccess = async (event) => {
                const db = event.target.result;
                
                try {
                    // First, check if key exists
                    const readTransaction = db.transaction([storeName], 'readonly');
                    const readStore = readTransaction.objectStore(storeName);
                    const getRequest = readStore.get('encryptionKey');
                    
                    getRequest.onsuccess = async () => {
                        let key = getRequest.result;
                        
                        if (!key) {
                            // Generate new key
                            key = await crypto.subtle.generateKey(
                                {
                                    name: 'AES-GCM',
                                    length: 256
                                },
                                true,
                                ['encrypt', 'decrypt']
                            );
                            
                            // Store the key in a separate transaction
                            const writeTransaction = db.transaction([storeName], 'readwrite');
                            const writeStore = writeTransaction.objectStore(storeName);
                            const putRequest = writeStore.put(key, 'encryptionKey');
                            
                            putRequest.onsuccess = () => {
                                resolve(key);
                            };
                            
                            putRequest.onerror = () => {
                                reject(putRequest.error);
                            };
                        } else {
                            resolve(key);
                        }
                    };
                    
                    getRequest.onerror = () => reject(getRequest.error);
                } catch (error) {
                    reject(error);
                }
            };
        });
    }

    /**
     * Encrypt data
     */
    async encrypt(data) {
        try {
            const key = await this.keyPromise;
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(JSON.stringify(data));
            
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encodedData
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);
            
            // Convert to base64 for storage
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    /**
     * Decrypt data
     */
    async decrypt(encryptedData) {
        try {
            const key = await this.keyPromise;
            
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);
            
            // Decrypt
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );
            
            // Decode and parse
            const decoder = new TextDecoder();
            const decryptedText = decoder.decode(decrypted);
            return JSON.parse(decryptedText);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const cryptoUtils = new CryptoUtils();
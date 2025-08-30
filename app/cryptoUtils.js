// Encryption utilities - works in all contexts (HTTP/HTTPS)
const jsSHA = require('jssha');

class CryptoUtils {
    constructor() {
        this.iterations = 10000;
    }

    // Simple XOR encryption that works everywhere
    xorEncrypt(data, key) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            result.push(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(String.fromCharCode(...result));
    }

    // XOR decryption
    xorDecrypt(data, key) {
        const decoded = atob(data);
        const result = [];
        for (let i = 0; i < decoded.length; i++) {
            result.push(String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
        }
        return result.join('');
    }

    // Derive key from password using SHA-256
    deriveKey(password, salt) {
        // Use jssha to create a key from password + salt
        const shaObj = new jsSHA('SHA-256', 'TEXT');
        shaObj.update(password + salt);
        
        // Run multiple iterations for key stretching
        let hash = shaObj.getHash('HEX');
        for (let i = 1; i < this.iterations; i++) {
            const iterSha = new jsSHA('SHA-256', 'TEXT');
            iterSha.update(hash + password + salt);
            hash = iterSha.getHash('HEX');
        }
        
        return hash;
    }

    // Generate random salt
    generateSalt() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Encrypt data with password
    async encrypt(data, password) {
        try {
            const salt = this.generateSalt();
            const key = this.deriveKey(password, salt);
            const jsonData = JSON.stringify(data);
            const encrypted = this.xorEncrypt(jsonData, key);
            
            return {
                encrypted: true,
                data: encrypted,
                salt: salt,
                version: 2
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    // Decrypt data with password
    async decrypt(encryptedObject, password) {
        try {
            if (!encryptedObject.encrypted) {
                throw new Error('Data is not encrypted');
            }

            const key = this.deriveKey(password, encryptedObject.salt);
            const decrypted = this.xorDecrypt(encryptedObject.data, key);
            
            try {
                return JSON.parse(decrypted);
            } catch (e) {
                throw new Error('Incorrect password or corrupted data');
            }
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data - incorrect password or corrupted data');
        }
    }

    // Check if data is encrypted
    isEncrypted(data) {
        return data && typeof data === 'object' && data.encrypted === true;
    }

    // Hash password for verification (not storing the password itself)
    async hashPassword(password) {
        const shaObj = new jsSHA('SHA-256', 'TEXT');
        shaObj.update(password);
        return shaObj.getHash('B64');
    }
}

module.exports = CryptoUtils;
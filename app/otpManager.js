const TOTP = require('./totp');
const Cookies = require('./cookies');
const CryptoUtils = require('./cryptoUtils');
const MigrationDecoder = require('./migrationDecoder');

class OTPManager {
    constructor() {
        this.entries = [];
        this.selectedId = null; // Track by ID instead of index
        this.storageEnabled = true; // Always enabled
        this.storageKey = 'otp-authenticator.entries';
        this.encryptionKey = 'otp-authenticator.encryption';
        this.crypto = new CryptoUtils();
        this.migrationDecoder = new MigrationDecoder();
        this.isEncrypted = false;
        this.sessionPassword = null;
        this.checkEncryptionStatus();
    }
    
    checkEncryptionStatus() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.isEncrypted = this.crypto.isEncrypted(data);
            }
        } catch (e) {
            this.isEncrypted = false;
        }
        return this.isEncrypted;
    }


    addEntry(secret, account, issuer, period) {
        // Use timestamp + random component to ensure unique IDs
        const id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
        const entry = {
            id,
            secret: secret || '',
            account: account || '',
            issuer: issuer || '',
            period: period || 30,
            generator: null
        };
        
        if (entry.secret) {
            try {
                entry.generator = new TOTP(entry.secret, entry.period);
            } catch (e) {
                console.error('Invalid TOTP secret:', e);
            }
        }
        
        this.entries.push(entry);
        // Don't auto-select the new entry
        // this.selectedIndex = this.entries.length - 1;
        
        this.saveToStorage();
        
        return entry;
    }

    updateEntry(id, updates) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index === -1) return null;
        
        const entry = this.entries[index];
        Object.assign(entry, updates);
        
        if (entry.secret) {
            try {
                entry.generator = new TOTP(entry.secret, entry.period);
            } catch (e) {
                console.error('Invalid TOTP secret:', e);
                entry.generator = null;
            }
        } else {
            entry.generator = null;
        }
        
        this.saveToStorage();
        
        return entry;
    }

    deleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index === -1) return false;
        
        // Check if we're deleting the selected entry
        const wasSelected = (id === this.selectedId);
        
        this.entries.splice(index, 1);
        
        // Clear selection after deletion
        if (wasSelected) {
            this.selectedId = null;
        }
        
        this.saveToStorage();
        
        return true;
    }

    selectEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            this.selectedId = id;
            return entry;
        }
        return null;
    }

    getSelectedEntry() {
        if (this.selectedId) {
            return this.entries.find(e => e.id === this.selectedId);
        }
        return null;
    }

    getAllEntries() {
        // Return a sorted copy without modifying the original array
        // This prevents the order from changing while editing
        return [...this.entries].sort((a, b) => {
            const nameA = (a.issuer || a.account || 'Unnamed').toLowerCase();
            const nameB = (b.issuer || b.account || 'Unnamed').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    async saveToStorage() {
        const dataToSave = this.entries.map(entry => ({
            id: entry.id,
            secret: entry.secret,
            account: entry.account,
            issuer: entry.issuer,
            period: entry.period
        }));
        
        try {
            let finalData;
            if (this.isEncrypted && this.sessionPassword) {
                finalData = await this.crypto.encrypt(dataToSave, this.sessionPassword);
            } else {
                finalData = dataToSave;
            }
            localStorage.setItem(this.storageKey, JSON.stringify(finalData));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    async loadFromStorage(password = null) {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsedData = JSON.parse(data);
                let entries;
                
                if (this.crypto.isEncrypted(parsedData)) {
                    if (!password) {
                        // Need password to decrypt
                        return { needsPassword: true };
                    }
                    try {
                        entries = await this.crypto.decrypt(parsedData, password);
                        this.sessionPassword = password;
                        this.isEncrypted = true;
                    } catch (e) {
                        return { error: 'Incorrect password' };
                    }
                } else {
                    entries = parsedData;
                    this.isEncrypted = false;
                }
                
                // Fix duplicate IDs if they exist
                const seenIds = new Set();
                this.entries = entries.map(entry => {
                    let entryId = entry.id;
                    
                    // If ID is missing or duplicate, generate a new one
                    if (!entryId || seenIds.has(entryId)) {
                        entryId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
                    }
                    seenIds.add(entryId);
                    
                    const loadedEntry = {
                        id: entryId,
                        secret: entry.secret,
                        account: entry.account,
                        issuer: entry.issuer,
                        period: entry.period || 30,
                        generator: null
                    };
                    
                    if (loadedEntry.secret) {
                        try {
                            loadedEntry.generator = new TOTP(loadedEntry.secret, loadedEntry.period);
                        } catch (e) {
                            console.error('Invalid TOTP secret on load:', e);
                        }
                    }
                    
                    return loadedEntry;
                });
                
                // Don't auto-select any entry on load
                this.selectedId = null;
                
                // Save back if we fixed any IDs
                if (this.entries.length > 0 && seenIds.size !== entries.length) {
                    await this.saveToStorage();
                }
                
                return { success: true };
            }
            return { success: true, empty: true };
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return { error: e.message };
        }
    }

    clearAll() {
        this.entries = [];
        this.selectedId = null;
        
        localStorage.removeItem(this.storageKey);
    }
    
    async enableEncryption(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        
        this.sessionPassword = password;
        this.isEncrypted = true;
        await this.saveToStorage();
        return { success: true };
    }
    
    async disableEncryption(password) {
        if (!this.isEncrypted) {
            return { success: true, message: 'Already unencrypted' };
        }
        
        // Verify password first
        if (password !== this.sessionPassword) {
            // Try to decrypt with provided password to verify
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsedData = JSON.parse(data);
                try {
                    await this.crypto.decrypt(parsedData, password);
                } catch (e) {
                    return { error: 'Incorrect password' };
                }
            }
        }
        
        this.sessionPassword = null;
        this.isEncrypted = false;
        await this.saveToStorage();
        return { success: true };
    }
    
    async exportEntries(includeEncryption = true) {
        // Export entries as JSON
        const dataToExport = this.entries.map(entry => ({
            secret: entry.secret,
            account: entry.account,
            issuer: entry.issuer,
            period: entry.period
        }));
        
        // If encrypted and user wants to maintain encryption
        if (this.isEncrypted && includeEncryption && this.sessionPassword) {
            const encryptedData = await this.crypto.encrypt(dataToExport, this.sessionPassword);
            return JSON.stringify(encryptedData, null, 2);
        }
        
        return JSON.stringify(dataToExport, null, 2);
    }
    
    importFromMigration(migrationUrl) {
        try {
            console.log('OTPManager: Importing from migration URL');
            const entries = this.migrationDecoder.decode(migrationUrl);
            console.log('OTPManager: Decoded entries:', entries);
            
            let addedCount = 0;
            let skippedCount = 0;
            
            for (const entry of entries) {
                // Check if entry already exists
                const exists = this.entries.some(existing => 
                    existing.secret === entry.secret && 
                    existing.issuer === entry.issuer && 
                    existing.account === entry.account
                );
                
                if (!exists && entry.secret) {
                    this.addEntry(
                        entry.secret,
                        entry.account || '',
                        entry.issuer || '',
                        entry.period || 30
                    );
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
            
            // Use synchronous save for now
            try {
                this.saveToStorage();
            } catch (e) {
                console.error('Failed to save after import:', e);
            }
            
            console.log(`OTPManager: Import complete - added: ${addedCount}, skipped: ${skippedCount}`);
            
            return {
                success: true,
                added: addedCount,
                skipped: skippedCount
            };
        } catch (error) {
            console.error('OTPManager: Import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async importEntries(jsonData, password = null) {
        try {
            const parsedData = JSON.parse(jsonData);
            let importedEntries;
            
            // Check if imported data is encrypted
            if (this.crypto.isEncrypted(parsedData)) {
                if (!password) {
                    return {
                        success: false,
                        needsPassword: true,
                        error: 'Encrypted data requires a password'
                    };
                }
                try {
                    importedEntries = await this.crypto.decrypt(parsedData, password);
                } catch (e) {
                    return {
                        success: false,
                        error: 'Failed to decrypt: incorrect password'
                    };
                }
            } else {
                importedEntries = parsedData;
            }
            
            if (!Array.isArray(importedEntries)) {
                throw new Error('Invalid import format: expected an array');
            }
            
            let addedCount = 0;
            let skippedCount = 0;
            
            for (const entry of importedEntries) {
                // Check if entry already exists (by matching secret + issuer + account)
                const exists = this.entries.some(existing => 
                    existing.secret === entry.secret && 
                    existing.issuer === entry.issuer && 
                    existing.account === entry.account
                );
                
                if (!exists && entry.secret) {
                    this.addEntry(
                        entry.secret || '',
                        entry.account || '',
                        entry.issuer || '',
                        entry.period || 30
                    );
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
            
            await this.saveToStorage();
            
            return {
                success: true,
                added: addedCount,
                skipped: skippedCount
            };
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
}

module.exports = OTPManager;
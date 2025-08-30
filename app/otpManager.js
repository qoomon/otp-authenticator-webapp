const TOTP = require('./totp');
const Cookies = require('./cookies');

class OTPManager {
    constructor() {
        this.entries = [];
        this.selectedIndex = -1;
        this.storageEnabled = true; // Always enabled
        this.storageKey = 'otp-authenticator.entries';
        this.loadFromStorage();
    }


    addEntry(secret, account, issuer, period) {
        const id = Date.now().toString();
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
        const wasSelected = (index === this.selectedIndex);
        
        this.entries.splice(index, 1);
        
        // Clear selection after deletion
        if (wasSelected) {
            this.selectedIndex = -1;
        } else if (this.selectedIndex > index) {
            // Adjust index if selected item was after the deleted one
            this.selectedIndex--;
        }
        
        this.saveToStorage();
        
        return true;
    }

    selectEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index !== -1) {
            this.selectedIndex = index;
            return this.entries[index];
        }
        return null;
    }

    getSelectedEntry() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.entries.length) {
            return this.entries[this.selectedIndex];
        }
        return null;
    }

    getAllEntries() {
        return this.entries;
    }

    saveToStorage() {
        const dataToSave = this.entries.map(entry => ({
            id: entry.id,
            secret: entry.secret,
            account: entry.account,
            issuer: entry.issuer,
            period: entry.period
        }));
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const entries = JSON.parse(data);
                this.entries = entries.map(entry => {
                    const loadedEntry = {
                        id: entry.id,
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
                this.selectedIndex = -1;
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }
    }

    clearAll() {
        this.entries = [];
        this.selectedIndex = -1;
        
        localStorage.removeItem(this.storageKey);
    }
}

module.exports = OTPManager;
# OTP Auth+ (v3.0.0)

An enhanced *Google Authenticator* alternative with multi-key management, local encryption, and advanced features.

Fork of the original otp-authenticator-webapp by qoomon: https://qoomon.github.io/otp-authenticator-webapp

> [!Important] 
> ☂️ No External Services are used, local JavaScript execution only ☂️

### Features

#### Core Features (Original)
* Generate TOTP codes
* Show remaining valid seconds for TOTP code
* Generate QR-code with OTPAuth URL
  * Click on QR-code to copy OTPAuth URL
* Parse OTPAuth URLs in the `secret` input field
  * e.g. `otpauth://totp/john.doe?secret=N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G&issuer=example.org`

#### Enhanced Features (OTP Auth+ v3.0.0)
* **Multi-Key Management**
  * Store and manage multiple OTP keys simultaneously
  * Grid layout displays all keys as cards
  * Visual timer indicators for each key
  * Formatted tokens (e.g., `123 456`) for better readability
  
* **Enhanced User Interface**
  * Clean grid view with responsive columns
  * Click to select/deselect entries
  * Calculator/form only appears when working with a key
  * Delete button appears on hover or selection
  * Consistent card sizing with proper spacing
  
* **Local Storage**
  * Automatic saving of all keys to browser's local storage
  * Keys persist across browser sessions
  * No manual save required - all changes auto-save
  
* **Improved Controls**
  * Add new key button (+) in header
  * Clear all keys button (trash icon) in header
  * More options button moved to input field
  * Dark mode support for all new features
  
* **Smart Selection**
  * Click entry to select and edit
  * Click again to deselect
  * Form hidden when no entry is selected
  
* **Security Features (New in v3.0.0)**
  * Optional password-based encryption for stored keys
  * Password confirmation to prevent lockout
  * Encrypted export/import with password protection
  * Works in both HTTP and HTTPS environments
  * SHA-256 key derivation with 10,000 iterations
  
* **Import/Export**
  * Export all keys to JSON file with date stamp
  * Import keys from JSON with automatic duplicate detection
  * Maintains encryption status during export
  * Password prompt for encrypted imports
  
* **Search & Organization**
  * Real-time search across all keys
  * Automatic alphabetical sorting by issuer
  * Responsive grid layout adapts to screen size

* **Google Authenticator Migration**
  * Direct import from Google Authenticator export QR codes
  * Bulk import of multiple accounts at once
  * Supports scanning QR codes or pasting migration URLs

### Deployment Options

#### Docker
```bash
docker run -d -p 8080:80 ghcr.io/YOUR_USERNAME/otp-authplus-webapp:latest
```

#### Static Files
Download the latest `otp-authplus-dist.zip` from the [Releases](../../releases) page and serve with any web server.

#### Build from Source
```bash
npm ci
npm run build
# Serve the dist/ directory with any web server
```
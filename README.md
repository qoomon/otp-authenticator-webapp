# otp-authenticator-webapp (Enhanced Fork) [![starline](https://starlines.qoo.monster/assets/qoomon/otp-authenticator-webapp)](https://github.com/qoomon/starlines)

[![Build Workflow](https://github.com/qoomon/otp-authenticator-webapp/workflows/Build%20&%20Deploy/badge.svg)](https://github.com/qoomon/otp-authenticator-webapp/actions)

An enhanced *Google Authenticator* like offline webapp with multi-key management and local storage.

Original hosted at github pages: https://qoomon.github.io/otp-authenticator-webapp

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

#### New Features (This Fork)
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
  
### Host in Your Own GitHub Account
* Fork this repo
* Go to your forked Repository -> `Settings` -> `GitHub Pages`
  * Ensure `Source` is set to `gh-pages`
  * Find your link to the app `Your site is published at https://USERNAME.github.io/otp-authenticator-webapp/`
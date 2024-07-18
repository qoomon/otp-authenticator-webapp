# otp-authenticator-webapp [![Sparkline](https://stars.medv.io/qoomon/otp-authenticator-webapp.svg)](https://stars.medv.io/qoomon/otp-authenticator-webapp)

[![Build Workflow](https://github.com/qoomon/otp-authenticator-webapp/workflows/Build%20&%20Deploy/badge.svg)](https://github.com/qoomon/otp-authenticator-webapp/actions)

A *Google Authenticator* like offline webapp.

## ☂️ No External Services are used, local JavaScript execution only ☂️

Hosted at github pages: https://qoomon.github.io/otp-authenticator-webapp/
* branch: [gh-pages](https://github.com/qoomon/otp-authenticator-webapp/tree/gh-pages)

Or host it on your onw GitHub account by just forking this repo.
* Go to Your forked Repository -> `Settings` -> `GitHub Pages`
  * Ensure `Source` is set to `gh-pages`
  * Find your link to the app `Your site is published at https://USERNAME.github.io/otp-authenticator-webapp/`

### Features
* generate TOTP codes
* show remaining valid seconds for totp code
* generate QR-code with OTPAuth URL
  * click on QR-code to copy OTPAuth URL
* parse OTPAuth URLs in the `secret` input field
  * e.g. `otpauth://totp/john.doe?secret=N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G&issuer=example.org`
  

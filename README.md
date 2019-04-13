# otp-authenticator-webapp
[![Build Status](https://travis-ci.com/qoomon/otp-authenticator-webapp.svg?branch=master)](https://travis-ci.com/qoomon/otp-authenticator-webapp)

A *Google Authenticator* like offline webapp.

## ☂️ No External Services are used, local JavaScript execution only ☂️

Hosted at github pages: https://qoomon.github.com/otp-authenticator-webapp/
* branch: [gh-pages](https://github.com/qoomon/otp-authenticator-webapp/tree/gh-pages)

Or host it on your onw GitHub account 
* Just fork this repo and this web app is available at [https://\<USERNAME>.github.com/otp-authenticator-webapp/](https://USERNAME.github.com/otp-authenticator-webapp/)


### Features
* generate totp codes
* show remaining valid seconds for totp code
* generate QR-code with OTPAuth URL
  * click on QR-code to copy OTPAuth URL
* parse otpauth URLs in `secret` input field
  * e.g. https://qoomon.github.io/otp-authenticator-webapp/#otpauth://totp/john.doe?secret=N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G&issuer=example.org

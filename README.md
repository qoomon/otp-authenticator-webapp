# otp-authenticator-webapp
[![Build Workflow](https://github.com/qoomon/otp-authenticator-webapp/workflows/Build%20&%20Deploy/badge.svg)](https://github.com/qoomon/otp-authenticator-webapp/actions)
[![LGTM Grade](https://img.shields.io/lgtm/grade/javascript/github/qoomon/otp-authenticator-webapp)](https://lgtm.com/projects/g/qoomon/otp-authenticator-webapp)

A *Google Authenticator* like offline webapp.

## ☂️ No External Services are used, local JavaScript execution only ☂️

Hosted at github pages: https://qoomon.github.com/otp-authenticator-webapp/
* branch: [gh-pages](https://github.com/qoomon/otp-authenticator-webapp/tree/gh-pages)

Or host it on your onw GitHub account 
* Just fork this repo and this web app is available at:
  
  [https://\<USERNAME>.github.com/otp-authenticator-webapp/](https://USERNAME.github.com/otp-authenticator-webapp/)


### Features
* generate TOTP codes
* show remaining valid seconds for totp code
* generate QR-code with OTPAuth URL
  * click on QR-code to copy OTPAuth URL
* parse OTPAuth URLs in the `secret` input field
  * e.g. `otpauth://totp/john.doe?secret=N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G&issuer=example.org`
  
## Developer Notes
* https://csscomb.herokuapp.com/online

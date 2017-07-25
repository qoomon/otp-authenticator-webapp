# google-authenticator-webapp
[![Build Status](https://travis-ci.org/qoomon/google-authenticator-webapp.svg?branch=master)](https://travis-ci.org/qoomon/google-authenticator-webapp)

## No External Services are used, local JavaScript execution only

Hosted at github pages: https://qoomon.github.com/google-authenticator-webapp/
* branch: [gh-pages](https://github.com/qoomon/google-authenticator-webapp/tree/gh-pages)


### Features
* generate totp codes
* show remaining valid seconds for totp code
* parse otpauth URLs in 'secret' input field
* generate otpauth URL QR code
* accept request parameters
  * secret
  * accoount
  * issuer
  
### Example
https://qoomon.github.io/google-authenticator-webapp/?secret=N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G&account=john.doe&issuer=example.org

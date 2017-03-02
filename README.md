# google-authenticator-webapp
google authenticator webapp

https://www.google.com/chart?chs=200x200&chld=M|0&cht=qr&chl=otpauth://totp/Example%3Aalice%40google.com%3Fsecret%3DJBSWY3DPEHPK3PXP%26issuer%3DExample

### In
* secret
  * text
  * qr code reader

### Out
* totp
* valid time
* qr code


npm install --global browserify
  browserify main.js -o bundle.js -v
npm install --global watchify
  watchify main.js -o bundle.js -v
npm install --global beefy
  beefy app.js:bundle.js --live
  
example secret N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G

var jsSHA = require('jssha');

function decToHex(dec){
  return dec.toString(16);
}

function hexToDec(hex){
  return parseInt(hex, 16);
}

function base32ToHex(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  let bits = '';
  for (let i = 0; i < base32.length; i++) {
    let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if(val < 0){
      throw new Error("Illegal Base32 character: " + base32.charAt(i));
    }
    bits += val.toString(2).padStart(5, '0');
  }

  let hex = '';
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    let chunk = bits.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
 }

  return hex;
}


function TOTP(secretBase32) {
  this.secretBase32 = secretBase32;
  this.stepSeconds = 30;
  this.tokenLength = 6;
  
  this.getToken = function() {
    let secretHex = base32ToHex(this.secretBase32);
    if (secretHex.length % 2 !== 0) {
      secretHex += '0';
    }
    let counter = Math.floor(Date.now()/1000/this.stepSeconds);
    let counterHex = decToHex(counter);

    let shaObj = new jsSHA("SHA-1", "HEX");
    shaObj.setHMACKey(secretHex, "HEX");
    shaObj.update(counterHex.padStart(16, "0"));
    let hmac = shaObj.getHMAC("HEX");
    let offset = hexToDec(hmac.slice(-1));
    let token = String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff')).slice(-6);

    return token;
  }
  
  this.getRemainingSeconds = function() {
    return this.stepSeconds - (Date.now()/1000) % this.stepSeconds;
  }
  
  this.getStepSeconds = function() {
    return this.stepSeconds;
  }
}

module.exports = TOTP;

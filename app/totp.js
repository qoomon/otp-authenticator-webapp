var jsSHA = require('jssha');
var anyBase = require('any-base');
anyBase.ZBASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

var decToHex = anyBase(anyBase.DEC, anyBase.HEX);
var hexToDec = anyBase(anyBase.HEX, anyBase.DEC);
var zbase32ToHex = anyBase(anyBase.ZBASE32, anyBase.HEX);

var getEpochSeconds = function() {
  return Math.floor(new Date().getTime() / 1000.0);
}

function TOTP(secretZBase32) {
  var stepSeconds = 30;
  this.secretZBase32 = secretZBase32.toUpperCase();

  this.getToken = function() {
    var shaObj = new jsSHA("SHA-1", "HEX");

    var secretHex = zbase32ToHex(this.secretZBase32);
    if (secretHex.length % 2 !== 0) {
      if (secretHex.endsWith('0')) {
        secretHex = secretHex.slice(0, -1);
      } else {
        secretHex = '0' + secretHex;
      }
    }
    shaObj.setHMACKey(secretHex, "HEX");

    var counter = Math.floor(getEpochSeconds() / stepSeconds);
    var timeHex = decToHex(counter.toString())
    var timeHexPadded = ('0'.repeat(16) + timeHex).slice(-16); // left pad with zeros
    shaObj.update(timeHexPadded);

    var hmac = shaObj.getHMAC("HEX");
    var offset = hexToDec(hmac.slice(-1));
    var token = String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff'));
    return token.slice(-6);
  }

  this.getRemainingSeconds = function() {
    return stepSeconds - getEpochSeconds() % stepSeconds;
  }
}

module.exports = TOTP;

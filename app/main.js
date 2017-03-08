"use strict";

var jsSHA = require('jssha');
var anyBase = require('any-base');
anyBase.BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

var ProgressBar = require('progressbar.js');

var decToHex = anyBase(anyBase.DEC, anyBase.HEX);
var hexToDec = anyBase(anyBase.HEX, anyBase.DEC);
var base32ToHex = anyBase(anyBase.BASE32, anyBase.HEX);

var leftPad = function(str, minLength, pad) {
   if (str.length >= minLength) {
       return str
   }
   return pad.repeat(minLength - str.length) + str;
};

var getEpochSeconds = function(){
  return Math.floor(new Date().getTime() / 1000.0);
}

function TOTP(secretBase32){
    var stepSeconds = 30;
    this.secretBase32=secretBase32;
   
    this.getCode = function(){
        var secretHex = base32ToHex(this.secretBase32);
        var timeHex = decToHex(String(Math.floor(getEpochSeconds() / stepSeconds)))
        var timeHexPadded = leftPad(timeHex, 16, '0');
        var shaObj = new jsSHA("SHA-1", "HEX");
        shaObj.setHMACKey(secretHex, "HEX");
        shaObj.update(timeHexPadded);
        var hmac = shaObj.getHMAC("HEX");
        var offset = hexToDec(hmac.substring(hmac.length - 1));
        var totp = String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff'));
        return totp.slice(-6);
    }

    this.getRemainingSeconds = function (){
      return stepSeconds - getEpochSeconds() % stepSeconds;
    }
}

// ################  run  ##################

// set default secret
document.getElementById('secret').value = 'N2SJSUOXCKQM5MAX7N7J3NBUQ4WTL66G';
// document.getElementById('otpauth-qr').src='https://chart.googleapis.com/chart?chs=150x150&cht=qr&chld=M|1&chl=otpauth://totp/username@domain.com?secret=ONSWG4TFORVWK6I=';

var totpRemainingSecondsCircle = new ProgressBar.Circle('#totp-remaining-seconds-circle', {
  strokeWidth: 50,
  duration: 1000,
  color: null, // null to support css styling
  trailColor: null //  null to support css styling
});
totpRemainingSecondsCircle.svg.style.transform= 'scale(-1, 1)';

setInterval(refresh_totp, 1000);
function refresh_totp() {
  var secretBase32 = document.getElementById('secret').value;
  if (secretBase32) {
    var totp = new TOTP(secretBase32);
    try {
      document.getElementById('totp').innerHTML = totp.getCode();
      if (totp.getRemainingSeconds() / 30.0 == 0) {
        totpRemainingSecondsCircle.set(1.0);
      } else {
        totpRemainingSecondsCircle.animate(totp.getRemainingSeconds() / 30.0);
      }
    } catch (err) {
      document.getElementById('totp').innerHTML = "Invalid Secret!";
      totpRemainingSecondsCircle.set(0.0);
    }

    
  } else {
    document.getElementById('totp').innerHTML = '';
    totpRemainingSecondsCircle.set(0.0);
  }
}

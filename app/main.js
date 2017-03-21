"use strict";

var jsSHA = require('jssha');
var anyBase = require('any-base');
anyBase.ZBASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

var ProgressBar = require('progressbar.js');
var QRCode = require('qrcodejs2');

var decToHex = anyBase(anyBase.DEC, anyBase.HEX);
var hexToDec = anyBase(anyBase.HEX, anyBase.DEC);
var zbase32ToHex = anyBase(anyBase.ZBASE32, anyBase.HEX);

var leftPad = function(str, minLength, pad) {
   if (str.length >= minLength) {
       return str
   }
   return pad.repeat(minLength - str.length) + str;
};

var getEpochSeconds = function(){
  return Math.floor(new Date().getTime() / 1000.0);
}

function TOTP(secretZBase32){
    var stepSeconds = 30;
    this.secretZBase32=secretZBase32;

    this.getToken = function(){
        var secretHex = zbase32ToHex(this.secretZBase32).replace(/(.*)0$/,"0$1");
        var timeHex = decToHex(String(Math.floor(getEpochSeconds() / stepSeconds)))
        var timeHexPadded = leftPad(timeHex, 16, '0');
        var shaObj = new jsSHA("SHA-1", "HEX");
        shaObj.setHMACKey(secretHex, "HEX");
        shaObj.update(timeHexPadded);
        var hmac = shaObj.getHMAC("HEX");
        var offset = hexToDec(hmac.substring(hmac.length - 1));
        var token = String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff'));
        return token.slice(-6);
    }

    this.getRemainingSeconds = function (){
      return stepSeconds - getEpochSeconds() % stepSeconds;
    }
}

var totpRemainingSecondsCircle = new ProgressBar.Circle('#totp-token-remaining-seconds-circle', {
  strokeWidth: 50,
  duration: 1000,
  color: 'inherit', // null to support css styling
  trailColor: 'inherit' //  null to support css styling
});
totpRemainingSecondsCircle.svg.style.transform= 'scale(-1, 1)';



document.getElementById('button-otpauth-qr').addEventListener('click', function(e){
  var otpauthQrImage= document.getElementById('otpauth-qr');
  var accountInput = document.getElementById('inputAccount');
  var issuerInput = document.getElementById('inputIssuer');
  if( otpauthQrImage.style.display == 'none'){
    otpauthQrImage.style.display = "inherit";
    accountInput.style.display = "inherit";
    issuerInput.style.display = "inherit";
  } else {
    otpauthQrImage.style.display = "none";
    accountInput.style.display = "none";
    issuerInput.style.display = "none";
  }
}, false);


var qrImage = new QRCode(document.getElementById('otpauth-qr'), {
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.M
});
console.log("### " + JSON.stringify(QRCode.CorrectLevel,2,2));
var updateQrImage= function(){
  var secret = document.getElementById('inputSecret').value;
  var account = document.getElementById('inputAccount').value;
  var issuer = document.getElementById('inputIssuer').value;
  var otpauthUrl = 'otpauth://totp/' + encodeURIComponent(issuer + ':' + account) + '?secret=' + encodeURIComponent(secret) + '&issuer=' + encodeURIComponent(issuer);
  qrImage.makeCode(otpauthUrl);
};
document.getElementById('inputIssuer').addEventListener('input', updateQrImage, false);
document.getElementById('inputAccount').addEventListener('input', updateQrImage, false);
document.getElementById('inputSecret').addEventListener('input', updateQrImage, false);

// ################  run  ##################

// set default secret
document.getElementById('inputSecret').value = 'JBSWY3DPEHPK3PXP';
updateQrImage(); 

setInterval(refresh_totp, 1000);
function refresh_totp() {
   var input = document.getElementById('inputSecret').value;
   if (input) {
      var secretBase32;
      if (input.startsWith("otpauth://")) {
         // // otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example
         var otpauthUrl = new URL(input);
         secretBase32 = otpauthUrl.searchParams.get('secret');
      } else {
         secretBase32 = input;
      }
      var totp = new TOTP(secretBase32);
      try {
         document.getElementById('totp-token').innerHTML = totp.getToken().replace(/(...)/g, "$1 ");
         if (totp.getRemainingSeconds() / 30.0 == 0) {
            totpRemainingSecondsCircle.set(1.0);
         } else {
            totpRemainingSecondsCircle.animate(totp.getRemainingSeconds() / 30.0);
         }
      } catch (err) {
         document.getElementById('totp-token').innerHTML = "Invalid Secret!";
         totpRemainingSecondsCircle.set(0.0);
      }
   } else {
      document.getElementById('totp-token').innerHTML = '';
      totpRemainingSecondsCircle.set(0.0);
   }
}

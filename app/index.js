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
    this.secretZBase32=secretZBase32.toUpperCase();

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

var totpRemainingSecondsCircle = new ProgressBar.Circle(document.getElementById('totp-token-remaining-seconds-circle'), {
  strokeWidth: 50,
  duration: 1000,
  color: 'inherit', // null to support css styling
  trailColor: 'transparent' //  null to support css styling
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

var update = function(){
  var secret = document.getElementById('inputSecret').value;
  if (secret.startsWith("otpauth://")) {
     var otpauthUrl = new URL(secret);
     secret = otpauthUrl.searchParams.get('secret');
     document.getElementById('inputAccount').value = decodeURIComponent(otpauthUrl.pathname).split(':')[1] || '';
     document.getElementById('inputIssuer').value = otpauthUrl.searchParams.get('issuer') || '';
  }
  var account = document.getElementById('inputAccount').value;
  var issuer = document.getElementById('inputIssuer').value;
  
  var otpauthUrl = 'otpauth://totp/' + encodeURIComponent(issuer + ':' + account) + '?secret=' + encodeURIComponent(secret) + '&issuer=' + encodeURIComponent(issuer);
  qrImage.makeCode(otpauthUrl);
};

function copyToClipboard(value) {
  // Create a temporary input
  var input = document.createElement("input");
  // Append it to body
  document.body.appendChild(input);
  
  // Set input value
  input.setAttribute("value", value);
  // Select input value
  input.select();
  // Copy input value
  document.execCommand("copy");
  
  // Remove input from body
  document.body.removeChild(input);
}

function showToast(value, timeout){
  timeout = timeout || 2000;
  
  var toastElement = document.createElement("div");
  toastElement.classList.add('toast');
  toastElement.innerText = value;
  
  document.body.appendChild(toastElement);
  setTimeout(function(){
    document.body.removeChild(toastElement);
  }, timeout);
}
                   
document.getElementById('inputIssuer').addEventListener('input', update, false);
document.getElementById('inputAccount').addEventListener('input', update, false);
document.getElementById('inputSecret').addEventListener('input', update, false);

['click', 'tap'].forEach(function(event){
    document.getElementById('totp-token').addEventListener(event, function() {
    copyToClipboard(this.innerText.replace(/\s/g,''));
    showToast("Copied!");
  }, false);
});
  
// ################  run  ##################
 
// init secret
var urlSearchParams = new URLSearchParams(window.location.search);
history.pushState(history.state, document.title, window.location.pathname);

var initSecret = urlSearchParams.get('secret') || 'JBSWY3DPEHPK3PXP'; //'otpauth://totp/Issuer%3AAccount?secret=JBSWY3DPEHPK3PXP&issuer=Issuer';
var initAccount = urlSearchParams.get('account');
var initIssuer = urlSearchParams.get('issuer');

document.getElementById('inputSecret').value = initSecret;
document.getElementById('inputAccount').value = initAccount;
document.getElementById('inputIssuer').value = initIssuer;

update(); 

setInterval(refresh_totp, 1000);
function refresh_totp() {
   var secret = document.getElementById('inputSecret').value;
   if (secret) {
      var totpTokenElement = document.getElementById('totp-token');
      if (secret.startsWith("otpauth://")) {
         secret = new URL(secret).searchParams.get('secret');
      } 
      var totp = new TOTP(secret);
      try {
         totpTokenElement.innerHTML = totp.getToken().replace(/(...)(?=.)/g, "$& ");
         if (totp.getRemainingSeconds() / 30.0 == 0) {
            totpRemainingSecondsCircle.set(1.0);
         } else {
            totpRemainingSecondsCircle.animate(totp.getRemainingSeconds() / 30.0);
         }
      } catch (err) {
         totpTokenElement.innerHTML = "Invalid Secret!";
         totpRemainingSecondsCircle.set(0.0);
      }
   } else {
      totpTokenElement.innerHTML = '';
      totpRemainingSecondsCircle.set(0.0);
   }
}

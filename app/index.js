"use strict";

document.getElementById('appversion').innerText = app.version;

var TOTP = require('./totp');

var ProgressBar = require('progressbar.js');
var QRCode = require('qrcodejs2');

var totpRemainingSecondsCircle = new ProgressBar.Circle(document.getElementById('totp-token-remaining-seconds-circle'), {
  strokeWidth: 50,
  duration: 1000,
  color: 'inherit', // null to support css styling
  trailColor: 'transparent' //  null to support css styling
});
totpRemainingSecondsCircle.svg.style.transform = 'scale(-1, 1)';

['click', 'tap'].forEach(function(event) {
  document.getElementById('button-otpauth-qr').addEventListener(event, function(e) {
    var otpauthQrImage = document.getElementById('otpauth-qr');
    var accountInput = document.getElementById('inputAccount');
    var issuerInput = document.getElementById('inputIssuer');
    if (otpauthQrImage.style.display == 'none') {
      otpauthQrImage.style.display = "inherit";
      accountInput.style.display = "inherit";
      issuerInput.style.display = "inherit";
    } else {
      otpauthQrImage.style.display = "none";
      accountInput.style.display = "none";
      issuerInput.style.display = "none";
    }
  }, false);
});

var qrImage = new QRCode(document.getElementById('otpauth-qr'), {
  colorDark: "#000000",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.Q
});

var update = function() {
  var secret = document.getElementById('inputSecret').value;
  if (secret.startsWith("otpauth://totp/")) {
    var otpauthUrl = new URL(secret);
    secret = otpauthUrl.searchParams.get('secret');
    document.getElementById('inputSecret').value = secret;
    var label = decodeURIComponent(otpauthUrl.pathname.replace(RegExp('^//totp/'), ''));
    if(!label.includes(":")){
      document.getElementById('inputAccount').value = label;
    } else {
      document.getElementById('inputIssuer').value = label.split(':')[0];
      document.getElementById('inputAccount').value = label.split(':')[1];
    }
    if(otpauthUrl.searchParams.get('issuer')){
      document.getElementById('inputIssuer').value = decodeURIComponent(otpauthUrl.searchParams.get('issuer'));
    }
  }
  
  var issuer = document.getElementById('inputIssuer').value;
  var account = document.getElementById('inputAccount').value;

  var otpauthUrl = 'otpauth://totp/' + encodeURIComponent(account) + '?secret=' + encodeURIComponent(secret) + '&issuer=' + encodeURIComponent(issuer);
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

function showToast(value, timeout) {
  timeout = timeout || 2000;

  var toastElement = document.createElement("div");
  toastElement.classList.add('toast');
  toastElement.innerText = value;

  document.body.appendChild(toastElement);
  setTimeout(function() {
    document.body.removeChild(toastElement);
  }, timeout);
}

document.getElementById('inputIssuer').addEventListener('input', update, false);
document.getElementById('inputAccount').addEventListener('input', update, false);
document.getElementById('inputSecret').addEventListener('input', update, false);

['click', 'tap'].forEach(function(event) {
  document.getElementById('totp-token').addEventListener(event, function() {
    copyToClipboard(this.innerText.replace(/\s/g, ''));
    showToast("Copied!");
  }, false);
});

// ################  run  ##################

//'...?_=otpauth://totp/ACCOUNT?secret=JBSWY3DPEHPK3PXP&issuer=ISSUER';
var otpauthUrl = document.location.search.replace(/^(.*_=)|(.*)/, "");

// init secret
var urlSearchParams = new URLSearchParams(window.location.search.replace(/_=.*$/, ""));
var secret = urlSearchParams.get('secret');

document.getElementById('inputSecret').value = otpauthUrl || secret;

// remove searchParams
history.pushState(history.state, document.title, window.location.pathname);

update();

setInterval(refresh_totp, 1000);

function refresh_totp() {
  var totpTokenElement = document.getElementById('totp-token');

  var secret = document.getElementById('inputSecret').value;
  if (secret) {
    secret = secret.replace(/\s/g, '');
    var totp = new TOTP(secret);
    try {
      totpTokenElement.innerHTML = totp.getToken().replace(/(...)(?=.)/g, "$& ");
      if (totp.getRemainingSeconds() / 30.0 <= 0) {
        totpRemainingSecondsCircle.set(1.0);
      } else {
        totpRemainingSecondsCircle.animate(totp.getRemainingSeconds() / 30.0);
      }
    } catch (err) {
      console.log(err);
      totpTokenElement.innerHTML = "Invalid Secret!";
      totpRemainingSecondsCircle.set(0.0);
    }
  } else {
    totpTokenElement.innerHTML = '';
    totpRemainingSecondsCircle.set(0.0);
  }
}

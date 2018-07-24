"use strict";

document.getElementById('appversion').innerText = app.version;

var TOTP = require('./totp');

var ProgressBar = require('progressbar.js');
var QRCode = require('qrcodejs2');

function getCookie(name) {
  var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
}

function setCookie(name, value) {
  document.cookie = name + "=" + value + "; path=/";
}

function buildOTPauthUrl(secret, account, issuer){
  return 'otpauth://totp/' + encodeURIComponent(account) + '?secret=' + encodeURIComponent(secret) + '&issuer=' + encodeURIComponent(issuer);
}

function parseOTPauthUrl(otpauthUrlString){
  var otpauthUrl = new URL(otpauthUrlString);
  
  var result = {};
  
  if(otpauthUrl.searchParams.get('secret')){
    result.secret = decodeURIComponent(otpauthUrl.searchParams.get('secret'));
  }
  
  var label = decodeURIComponent(otpauthUrl.pathname.replace(RegExp('^//totp/'), ''));
  if(!label.includes(":")){
    result.account = label;
  } else {
    result.account = label.split(':')[1];
    result.issuer = label.split(':')[0];
  }
  if(otpauthUrl.searchParams.get('issuer')){
    result.issuer = decodeURIComponent(otpauthUrl.searchParams.get('issuer'));
  }
  
  return result;
}

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

var totpRemainingSecondsCircle = new ProgressBar.Circle(document.getElementById('totp-token-remaining-seconds-circle'), {
  strokeWidth: 50,
  duration: 1000,
  color: 'inherit', // null to support css styling
  trailColor: 'transparent' //  null to support css styling
});
totpRemainingSecondsCircle.svg.style.transform = 'scale(-1, 1)';

var qrImage = new QRCode(document.getElementById('otpauth-qr'), {
  colorDark: "#000000",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.Q
});
qrImage._el.getElementsByTagName("img")[0].style.width = '100%'; // FIX: scaling problem with padding

var update = function() {
  var secret = document.getElementById('inputSecret').value;
  var issuer = document.getElementById('inputIssuer').value;
  var account = document.getElementById('inputAccount').value;
  
  if (secret.startsWith("otpauth://totp/")) {
    var otpauthParameters = parseOTPauthUrl(secret);
    secret = otpauthParameters.secret || ' ';
    issuer = otpauthParameters.issuer;
    account = otpauthParameters.account;
    showOtpauthQr();
  }
  
  document.getElementById('inputSecret').value = secret || '';
  document.getElementById('inputIssuer').value = issuer || '';
  document.getElementById('inputAccount').value = account || '';
  
  if(secret && account){
    var otpauthUrl = buildOTPauthUrl(secret, account, issuer);
    qrImage.makeCode(otpauthUrl);
    qrImage._el.removeAttribute("title"); // WORKAROUND: prevent showing otpauthUrl in html
    document.getElementById('otpauth-qr-overlay').style.display='none';
  } else {
    qrImage.makeCode('');
    document.getElementById('otpauth-qr-overlay').innerHTML = "Input missing!";
    document.getElementById('otpauth-qr-overlay').style.display='';
  }
};

// ################  input handling  ##################

document.getElementById('inputIssuer').addEventListener('input', update, false);
document.getElementById('inputAccount').addEventListener('input', update, false);
document.getElementById('inputSecret').addEventListener('input', update, false);

['click', 'tap'].forEach(function(event) {
  document.getElementById('totp-token').addEventListener(event, function() {
    copyToClipboard(this.innerText);
    showToast("Token copied!");
  }, false);
});

['click', 'tap'].forEach(function(event) {
  document.getElementById('otpauth-qr').addEventListener(event, function() {
    var secret = document.getElementById('inputSecret').value;
    var account = document.getElementById('inputAccount').value;
    var issuer = document.getElementById('inputIssuer').value;
    var otpauthUrl = buildOTPauthUrl(secret, account, issuer);
    copyToClipboard(otpauthUrl);
    showToast("OTPAuth url copied!");
  }, false);
});


function showOtpauthQr() {
  document.getElementById('otpauth-qr').style.display = "";
  document.getElementById('inputAccount').style.display = "";
  document.getElementById('inputIssuer').style.display = "";
}

function hideOtpauthQr() {
  document.getElementById('otpauth-qr').style.display = "none";
  document.getElementById('inputAccount').style.display = "none";
  document.getElementById('inputIssuer').style.display = "none";
}

function toggleOtpauthQr() {
  if (document.getElementById('otpauth-qr').style.display == 'none') {
    showOtpauthQr();
  } else {
    hideOtpauthQr();
  }
}

function toggleDarkMode() {
  var darkStyleElement = document.getElementById('dark-style');
  darkStyleElement.disabled = !darkStyleElement.disabled;
  setCookie("otp-authenticator.darkStyle", !darkStyleElement.disabled);
}

['click', 'tap'].forEach(function(event) {
  document.getElementById('button-otpauth-qr').addEventListener(event, function(e) {
    toggleOtpauthQr();
  }, false);
});

['click', 'tap'].forEach(function(event) {
  document.getElementById('appname').addEventListener(event, function(e) {
    toggleDarkMode();
  }, false);
});

// ################  run  ##################

var darkStyleCookie = getCookie("otp-authenticator.darkStyle");
if (darkStyleCookie === "true") {
  toggleDarkMode();
}

window.onhashchange = function(){
  var secret = window.location.hash.substr(1);
  history.pushState(history.state, document.title, window.location.pathname); // remove hash
  document.getElementById('inputSecret').value = secret;
  update();
};
window.onhashchange();

setInterval(refresh_totp, 1000);

function refresh_totp() {
  var totpTokenElement = document.getElementById('totp-token');

  var secret = document.getElementById('inputSecret').value;
  if (secret) {
    secret = secret.replace(/\s/g, '');
    var totp = new TOTP(secret);
    try {
      totpTokenElement.innerHTML = totp.getToken().replace(/(...)(...)/g, '<span>$1</span><span style="margin-left:8px">$2</span>');
      var normalizedRemainingTime = totp.getRemainingSeconds() / totp.getStepSeconds();
      if ( normalizedRemainingTime <= 0) {
        totpRemainingSecondsCircle.set(1.0);
      } else {
        totpRemainingSecondsCircle.animate(normalizedRemainingTime);
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

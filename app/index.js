"use strict";

document.getElementById('app-version').innerText = APP.version;

const QRCode = require('qrcodejs2');
const TOTP = require('./totp');
const Cookies = require('./cookies');
const OTPAuthUrl = require('./otpauthUrl');

function copyToClipboard(value) {
    // Create a temporary input
    const input = document.createElement("input");
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

    const toastElement = document.createElement("div");
    toastElement.classList.add('toast');
    toastElement.innerText = value;

    document.body.appendChild(toastElement);
    setTimeout(function () {
        document.body.removeChild(toastElement);
    }, timeout);
}

let totpGenerator = undefined;

const qrImage = new QRCode(document.getElementById('otpauth-qr-image'), {
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.Q,
    // calculate final size by removing padding and border from size,
    // fix padding problem on mobile devices see index.css > #otpauth-qr
    width: 256 - ((1 + 16) * 2), 
    height: 256 - ((1 + 16) * 2)
});

function updateTotpGenerator() {
    let secret = document.getElementById('inputSecret').value.replace(/\s/g, '');
    let period = document.getElementById('inputPeriod').value;

    if (secret) {
        totpGenerator = new TOTP(secret, period);
    } else {
        totpGenerator = undefined;
    }

    refreshTotpToken();
}


function updateQrCode() {
    const secret = document.getElementById('inputSecret').value;
    const issuer = document.getElementById('inputIssuer').value;
    const account = document.getElementById('inputAccount').value;
    const period = document.getElementById('inputPeriod').value;

    if (secret && account) {
        const otpauthUrl = OTPAuthUrl.build(secret.replace(/\s+/g, ''), account, issuer, period);
        qrImage.makeCode(otpauthUrl);
        document.getElementById('otpauth-qr-overlay').style.display = 'none';
    } else {
        qrImage.makeCode('https://qoomon.me');
        document.getElementById('otpauth-qr-overlay').style.display = '';
    }
}

function updateLabel() {
    const issuer = document.getElementById('inputIssuer').value;
    const account = document.getElementById('inputAccount').value;
    let label = issuer;
    if (account) {
        if (label) {
          label += ` (${account})`
        } else {
          label += account
        }
    }

    document.getElementById('totp-label').innerText = label;
}

function parseSecretInput() {
    let secret = document.getElementById('inputSecret').value;
    if (secret.startsWith("otpauth://totp/")) {
        const otpauthParameters = OTPAuthUrl.parse(secret);
        secret = otpauthParameters.secret;
        let issuer = otpauthParameters.issuer;
        let account = otpauthParameters.account;
        let period = otpauthParameters.period;

        document.getElementById('inputSecret').value = secret || ' ';
        document.getElementById('inputSecret').dispatchEvent(new Event('input'));
        document.getElementById('inputIssuer').value = issuer || '';
        document.getElementById('inputIssuer').dispatchEvent(new Event('input'));
        document.getElementById('inputAccount').value = account || '';
        document.getElementById('inputAccount').dispatchEvent(new Event('input'));
        document.getElementById('inputPeriod').value = period || '';
        document.getElementById('inputPeriod').dispatchEvent(new Event('input'));
    }
}

function showOtpAuthDetails() {
    document.getElementById('inputAccount').style.display = "";
    document.getElementById('inputIssuer').style.display = "";
    document.getElementById('inputPeriod').style.display = "";
    document.getElementById('otpauth-qr').style.display = "";
}

function hideOtpAuthDetails() {
    document.getElementById('inputAccount').style.display = "none";
    document.getElementById('inputIssuer').style.display = "none";
    document.getElementById('inputPeriod').style.display = "none";
    document.getElementById('otpauth-qr').style.display = "none";
}

function toggleOtpAuthDetails() {
    if (document.getElementById('inputAccount').style.display === 'none') {
        showOtpAuthDetails();
    } else {
        hideOtpAuthDetails();
    }
}

function toggleDarkMode() {
    const darkStyleElement = document.getElementById('dark-mode');
    darkStyleElement.disabled = !darkStyleElement.disabled;
    Cookies.set("otp-authenticator.darkStyle", !darkStyleElement.disabled);
}

function setRemainingTimePiePercentage(percentage) {
  document.querySelector("#totp-token-remaining-seconds-pie > circle").style.strokeDashoffset = -1 + percentage;
}

function setTokenHtml(html) {
  document.getElementById('totp-token').innerHTML = html;
}

function formatToken(token) {
  return token.replace(/(...)(...)/g, '<span>$1</span><span style="margin-left:8px">$2</span>')
}

// ################  input handling  ##################

document.getElementById('inputSecret').addEventListener('input', () => {
    parseSecretInput();
    updateTotpGenerator();
    updateQrCode();
}, false);

document.getElementById('inputAccount').addEventListener('input', () => {
    updateLabel();
    updateQrCode();
}, false);

document.getElementById('inputIssuer').addEventListener('input', () => {
    updateLabel();
    updateQrCode();
}, false);

document.getElementById('inputPeriod').addEventListener('input', () => {
    parseSecretInput();
    updateTotpGenerator();
    updateQrCode();
}, false);

['click', 'tap'].forEach(event => {
    document.getElementById('totp-token').addEventListener(event, function () {
        copyToClipboard(this.innerText);
        showToast("Token copied!");
    }, false);
});

['click', 'tap'].forEach(event => {
    document.getElementById('otpauth-qr').addEventListener(event, function () {
        const secret = document.getElementById('inputSecret').value;
        const account = document.getElementById('inputAccount').value;
        const issuer = document.getElementById('inputIssuer').value;
        const period = document.getElementById('inputPeriod').value;
        const otpauthUrl = OTPAuthUrl.build(secret, account, issuer, period);
        copyToClipboard(otpauthUrl);
        showToast("OTPAuth url copied!");
    }, false);
});

['click', 'tap'].forEach(event => {
    document.getElementById('more-button').addEventListener(event, function () {
        toggleOtpAuthDetails();
    }, false);
});

['click', 'tap'].forEach(event => {
    document.getElementById('totp-label').addEventListener(event, function () {
        toggleOtpAuthDetails();
    }, false);
});

['click', 'tap'].forEach(event => {
    document.getElementById('light-switch').addEventListener(event, function () {
        toggleDarkMode();
    }, false);
});

// ################  run  ##################
if (!Cookies.get("otp-authenticator.darkStyle") && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    Cookies.set("otp-authenticator.darkStyle", "true");
}
if (Cookies.get("otp-authenticator.darkStyle") === "true") {
    toggleDarkMode();
}

updateQrCode();

setInterval(refreshTotpToken, 1000);
function refreshTotpToken() {
    if (totpGenerator) {
        try {
            setTokenHtml(formatToken(totpGenerator.getToken()));
            setRemainingTimePiePercentage(totpGenerator.getRemainingSeconds() / totpGenerator.getStepSeconds());
        } catch (err) {
            console.info(err.message);
            setTokenHtml("Invalid Secret!");
            setRemainingTimePiePercentage(0);
        }
    } else {
        setTokenHtml(formatToken('000000'));
        setRemainingTimePiePercentage(0);
    }
}

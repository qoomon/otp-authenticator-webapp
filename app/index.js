"use strict";

document.getElementById('appversion').innerText = APP.version;

const TOTP = require('./totp');
const Cookies = require('./cookies');
const OTPAuthUrl = require('./otpauthUrl');

const ProgressBar = require('progressbar.js');
const QRCode = require('qrcodejs2');


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

const totpRemainingSecondsCircle = new ProgressBar.Circle(document.getElementById('totp-token-remaining-seconds-circle'), {
    strokeWidth: 50,
    duration: 1000,
    color: 'inherit', // null to support css styling
    trailColor: 'transparent' //  null to support css styling
});
totpRemainingSecondsCircle.svg.style.transform = 'scale(-1, 1)';

const qrImage = new QRCode(document.getElementById('otpauth-qr'), {
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.Q
});
qrImage._el.getElementsByTagName("img")[0].style.width = '100%'; // FIX: scaling problem with padding


function updateTotpGenerator() {
    let secret = document.getElementById('inputSecret').value.replace(/\s/g, '');

    if (secret) {
        totpGenerator = new TOTP(secret);
    } else {
        totpGenerator = undefined;
    }

    refreshTotpToken();
}


function updateQrCode() {
    const secret = document.getElementById('inputSecret').value;
    const issuer = document.getElementById('inputIssuer').value;
    const account = document.getElementById('inputAccount').value;

    if (secret && account) {
        const otpauthUrl = OTPAuthUrl.build(secret.replace(/\s+/g, ''), account, issuer);
        qrImage.makeCode(otpauthUrl);
        document.getElementById('otpauth-qr-overlay').style.display = 'none';
    } else {
        qrImage.makeCode('');
        document.getElementById('otpauth-qr-overlay').innerHTML = "Input missing!";
        document.getElementById('otpauth-qr-overlay').style.display = '';
    }
}

function updateLabel() {
    const issuer = document.getElementById('inputIssuer').value;
    const account = document.getElementById('inputAccount').value || 'unknown';

    let label = account;
    if (issuer) {
        label = `${issuer} (${account})`;
    }

    document.getElementById('totp-label').innerText = label;

    if ((account || issuer) && document.getElementById('inputAccount').style.display === 'none') {
        document.getElementById('totp-label').style.display = '';
    } else {
        document.getElementById('totp-label').style.display = 'none';
    }
}

function parseSecretInput() {
    let secret = document.getElementById('inputSecret').value;
    if (secret.startsWith("otpauth://totp/")) {
        const otpauthParameters = OTPAuthUrl.parse(secret);
        secret = otpauthParameters.secret;
        let issuer = otpauthParameters.issuer;
        let account = otpauthParameters.account;

        document.getElementById('inputSecret').value = secret || ' ';
        document.getElementById('inputSecret').dispatchEvent(new Event('input'));
        document.getElementById('inputIssuer').value = issuer || '';
        document.getElementById('inputIssuer').dispatchEvent(new Event('input'));
        document.getElementById('inputAccount').value = account || '';
        document.getElementById('inputAccount').dispatchEvent(new Event('input'));
    }
}

function showOtpAuthDetails() {
    document.getElementById('inputAccount').style.display = "";
    document.getElementById('inputIssuer').style.display = "";
    document.getElementById('totp-label').style.display = "none";
    document.getElementById('otpauth-qr').style.display = "";
}

function hideOtpAuthDetails() {
    document.getElementById('inputAccount').style.display = "none";
    document.getElementById('inputIssuer').style.display = "none";
    if (document.getElementById('inputAccount').value || document.getElementById('inputIssuer').value) {
        document.getElementById('totp-label').style.display = "";
    }
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
    const darkStyleElement = document.getElementById('dark-style');
    darkStyleElement.disabled = !darkStyleElement.disabled;
    Cookies.set("otp-authenticator.darkStyle", !darkStyleElement.disabled);
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


['click', 'tap'].forEach(function (event) {
    document.getElementById('totp-token').addEventListener(event, function () {
        copyToClipboard(this.innerText);
        showToast("Token copied!");
    }, false);
});

['click', 'tap'].forEach(function (event) {
    document.getElementById('otpauth-qr').addEventListener(event, function () {
        const secret = document.getElementById('inputSecret').value;
        const account = document.getElementById('inputAccount').value;
        const issuer = document.getElementById('inputIssuer').value;
        const otpauthUrl = OTPAuthUrl.build(secret, account, issuer);
        copyToClipboard(otpauthUrl);
        showToast("OTPAuth url copied!");
    }, false);
});

['click', 'tap'].forEach(function (event) {
    document.getElementById('otpauth-button').addEventListener(event, function () {
        toggleOtpAuthDetails();
    }, false);
});

['click', 'tap'].forEach(function (event) {
    document.getElementById('totp-label').addEventListener(event, function () {
        toggleOtpAuthDetails();
    }, false);
});

['click', 'tap'].forEach(function (event) {
    document.getElementById('light-switch').addEventListener(event, function () {
        toggleDarkMode();
    }, false);
});

// ################  run  ##################

updateQrCode();

if (Cookies.get("otp-authenticator.darkStyle") === "true") {
    toggleDarkMode();
}

setInterval(refreshTotpToken, 1000);

function refreshTotpToken() {
    const totpTokenElement = document.getElementById('totp-token');

    if (totpGenerator) {
        try {
            totpTokenElement.innerHTML = totpGenerator.getToken().replace(/(...)(...)/g, '<span>$1</span><span style="margin-left:8px">$2</span>');
            const normalizedRemainingTime = totpGenerator.getRemainingSeconds() / totpGenerator.getStepSeconds();
            if (normalizedRemainingTime <= 0) {
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
        totpTokenElement.innerHTML = '000000'.replace(/(...)(...)/g, '<span>$1</span><span style="margin-left:8px">$2</span>');
        totpRemainingSecondsCircle.set(0.0);
    }
}

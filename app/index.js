"use strict";

document.getElementById('app-version').innerText = APP.version;

const {
  BrowserQRCodeReader,
  BrowserQRCodeSvgWriter, 
  EncodeHintType
} = require('@zxing/library');
const QRCodeWriter = new BrowserQRCodeSvgWriter()
const QRCodeReader = new BrowserQRCodeReader()
const TOTP = require('./totp');
const Cookies = require('./cookies');
const OTPAuthUrl = require('./otpauthUrl');
const OTPManager = require('./otpManager');

let totpGenerator = undefined;
let otpManager = new OTPManager();
let isMultiKeyView = true; // Always show multi-key view
let currentlySwitching = false; // Flag to prevent update conflicts
let isInitialized = false; // Track if app is initialized

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

function updateTotpGenerator() {
    if (currentlySwitching) return; // Don't update while switching entries
    
    let secret = document.getElementById('input-secret').value.replace(/\s/g, '');
    
    // Don't try to create TOTP for migration URLs
    if (secret.startsWith('otpauth-migration://')) {
        return;
    }
    
    let period = document.getElementById('input-period').value;

    totpGenerator = secret ? new TOTP(secret, period) : undefined;
   
    updateTotpToken();
    
    // Update current entry if in multi-key mode
    if (isMultiKeyView) {
        const selectedEntry = otpManager.getSelectedEntry();
        if (selectedEntry) {
            const account = document.getElementById('input-account').value;
            const issuer = document.getElementById('input-issuer').value;
            otpManager.updateEntry(selectedEntry.id, {
                secret: secret,
                account: account,
                issuer: issuer,
                period: period || 30
            });
            renderEntriesList();
        }
    }
}

function updateTotpToken() {
    let tokenElement = document.getElementById('totp-token');
    if (totpGenerator) {
        try {
            tokenElement.textContent = formatToken(totpGenerator.getToken());
            setRemainingTimePiePercentage(totpGenerator.getRemainingSeconds() / totpGenerator.getStepSeconds());
        } catch (err) {
            console.info(err.message);
            tokenElement.textContent = "Invalid Secret!";
            setRemainingTimePiePercentage(0);
        }
    } else {
        tokenElement.textContent = formatToken('000000');
        setRemainingTimePiePercentage(0);
    }
}

function updateQrCode() {
    const secret = document.getElementById('input-secret').value;
    
    // Don't generate QR code for migration URLs
    if (secret.startsWith('otpauth-migration://')) {
        document.getElementById('otpauth-qr-overlay').style.display = 'none';
        return;
    }
    
    const issuer = document.getElementById('input-issuer').value;
    const account = document.getElementById('input-account').value;
    const period = document.getElementById('input-period').value;

    let qrMessage = 'https://qoo.monster'
    document.getElementById('otpauth-qr-overlay').style.display = '';
    
    if (secret && account) {
        qrMessage = OTPAuthUrl.build(secret.replace(/\s+/g, ''), account, issuer, period);
        document.getElementById('otpauth-qr-overlay').style.display = 'none';
    }

    // generate qr code as svg data image url
    let svgElement = QRCodeWriter.write(qrMessage, 0, 0, new Map([
        [EncodeHintType.CHARACTER_SET, "UTF-8"],
        [EncodeHintType.ERROR_CORRECTION, "Q"],
        [EncodeHintType.MARGIN, 2],
      ])
    );
    
    var svgXml = new XMLSerializer().serializeToString(svgElement);
    var imageDataUrl = 'data:image/svg+xml;base64,' + btoa(svgXml);
    
    // set svg as image
    let img = document.getElementById('otpauth-qr-image');
    img.src = imageDataUrl;
    
    // convert svg image to png
    img.onload = () => {
      img.onload = null;
    
      var canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      canvas.getContext("2d")
        .drawImage(img, 0, 0, canvas.width, canvas.height);
    
      img.src = canvas.toDataURL();
    }
}

function updateLabel() {
    const issuer = document.getElementById('input-issuer').value?.trim();
    const account = document.getElementById('input-account').value?.trim();
    let label = issuer;
    if(issuer && account) {
      label = `${issuer} (${account})`
    } else if(issuer) {
      label = issuer
    } else if(account) {
      label = account
    }

    let labelElement = document.getElementById('totp-label');
    labelElement.innerText = label;
    labelElement.style.marginBottom = label ? null : '0';
    labelElement.style.height = label ? null : '0';
}

function showOtpAuthDetails() {
    document.getElementById('input-account').style.display = '';
    document.getElementById('input-issuer').style.display = '';
    document.getElementById('input-period').style.display = '';
    document.getElementById('otpauth-qr').style.display = '';
}

function hideOtpAuthDetails() {
    document.getElementById('input-account').style.display = 'none';
    document.getElementById('input-issuer').style.display = 'none';
    document.getElementById('input-period').style.display = 'none';
    document.getElementById('otpauth-qr').style.display = 'none';
}

function toggleOtpAuthDetails() {
    if (document.getElementById('input-account').style.display === 'none') {
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

function formatToken(token) {
  // Format as "123 456" for 6-digit tokens
  return token.replace(/(...)/g, '$1 ').trim();
}

// ################  input handling  ##################

function handleOtpauthUrl(otpauthUrl) {
    // otpauth://totp/issuer%3Aaccount?secret=secret&issuer=issuer
    const otpauthParameters = OTPAuthUrl.parse(otpauthUrl);

    document.getElementById('input-secret').value = otpauthParameters.secret || ' ';
    document.getElementById('input-secret').dispatchEvent(new Event('input'));
    
    document.getElementById('input-issuer').value = otpauthParameters.issuer || '';
    document.getElementById('input-issuer').dispatchEvent(new Event('input'));
    
    document.getElementById('input-account').value = otpauthParameters.account || '';
    document.getElementById('input-account').dispatchEvent(new Event('input'));
    
    document.getElementById('input-period').value = otpauthParameters.period || '';
    document.getElementById('input-period').dispatchEvent(new Event('input'));
}

function handleMigrationUrl(migrationUrl) {
    console.log('Handling migration URL:', migrationUrl.substring(0, 50) + '...');
    
    // Clear the input field first
    document.getElementById('input-secret').value = '';
    
    // Check if we're currently editing an empty entry and remove it
    const selectedEntry = otpManager.getSelectedEntry();
    if (selectedEntry && !selectedEntry.secret && !selectedEntry.account && !selectedEntry.issuer) {
        // This is an empty entry that was just created - delete it
        otpManager.deleteEntry(selectedEntry.id);
        otpManager.selectedId = null;
    }
    
    try {
        // Import from migration URL
        const result = otpManager.importFromMigration(migrationUrl);
        console.log('Import result:', result);
        
        if (result.success) {
            renderEntriesList();
            if (result.added > 0) {
                showToast(`Imported ${result.added} keys from Google Authenticator${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`);
            } else {
                showToast(`All keys already exist (${result.skipped} skipped)`);
            }
            
            // Hide the calculator since we just imported
            document.getElementById('calculator-container').style.display = 'none';
        } else {
            console.error('Migration import error:', result.error);
            alert(`Migration import failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Migration handling error:', error);
        alert(`Migration import failed: ${error.message}`);
    }
}

document.getElementById('input-video-button').addEventListener('click', () => {

  document.getElementById('input-video-dialog').style.display = '';
  
  const decodeFromInputVideoDevice = (selectedDeviceId) => {
    QRCodeReader.decodeOnceFromVideoDevice(selectedDeviceId, 'input-video')
      .then((result) => {
        if(result.text.startsWith('otpauth://totp/')){
          handleOtpauthUrl(result.text)
        } else if(result.text.startsWith('otpauth-migration://')) {
          handleMigrationUrl(result.text)
        } else {
          alert('Invalid OTP auth QR code!')
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        QRCodeReader.reset()
        document.getElementById('input-video-dialog').style.display = 'none'; 
      });
    };
  
  QRCodeReader.getVideoInputDevices()
    .then((videoInputDevices) => {
      if (videoInputDevices.length <= 0) {
        alert("No camera device available!")
        return;
      }
      if (videoInputDevices.length == 1) {
        decodeFromInputVideoDevice(videoInputDevices[0].deviceId);
      } else {
        let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if(isMobileDevice) {
          decodeFromInputVideoDevice(undefined);
        } else {
          let videoInputDevice = videoInputDevices.find(device => device.label != 'Snap Camera' && device.label != 'OBS-Camera');
          decodeFromInputVideoDevice(videoInputDevice.deviceId);
        }
      }
      
      // TODO
      // const sourceSelect = document.getElementById('sourceSelect')
      // sourceSelect.textContent = '';
      // 
      // videoInputDevices.forEach((element) => {
      //   const sourceOption = document.createElement('option')
      //   sourceOption.text = element.label
      //   sourceOption.value = element.deviceId
      //   sourceSelect.appendChild(sourceOption)
      // });
      // 
      // sourceSelect.onchange = () => {
      //   decodeFromInputVideoDevice(sourceSelect.value);
      // };
      
    })
    .catch((err) => console.error(err));
});

document.getElementById('input-video-dialog').addEventListener('click', () => {
  QRCodeReader.reset();
  document.getElementById('input-video-dialog').style.display = 'none'; 
});
 
document.getElementById('input-image').addEventListener('change', (event) => {
  const imageFile = event.target.files[0];
  if(imageFile) {
    const image = new Image();
    var fileReader = new FileReader();
    fileReader.onload = (event) => image.src = event.target.result;
    fileReader.readAsDataURL(imageFile);
    image.onerror = (err) => alert('Invalid image!');
    image.onload = () => QRCodeReader.decodeFromImage(image)
      .then((result) => {
        if(result.text.startsWith('otpauth://totp/')) {
          handleOtpauthUrl(result.text);
        } else if(result.text.startsWith('otpauth-migration://')) {
          handleMigrationUrl(result.text);
        } else {
          alert('Invalid OTP auth QR code!')
        }
      })
      .catch((err) => {
        console.error(err);
        alert('Couldn\'t find any QR code in image!');
      });
  }
});

document.getElementById('input-secret').addEventListener('input', (event) => {
    let secret = event.target.value;
    if (secret.startsWith("otpauth://totp/")) {
      handleOtpauthUrl(secret);
    } else if (secret.startsWith("otpauth-migration://")) {
      // Handle migration URL - return early to prevent further processing
      handleMigrationUrl(secret);
      return;
    }
    updateTotpGenerator();
    updateQrCode();
}, false);

document.getElementById('input-account').addEventListener('input', () => {
    updateLabel();
    updateQrCode();
    
    // Update entry when editing account field
    if (!currentlySwitching && isMultiKeyView) {
        const selectedEntry = otpManager.getSelectedEntry();
        if (selectedEntry) {
            const account = document.getElementById('input-account').value;
            otpManager.updateEntry(selectedEntry.id, {
                ...selectedEntry,
                account: account
            });
            renderEntriesList();
        }
    }
}, false);

document.getElementById('input-issuer').addEventListener('input', () => {
    updateLabel();
    updateQrCode();
    
    // Update entry when editing issuer field
    if (!currentlySwitching && isMultiKeyView) {
        const selectedEntry = otpManager.getSelectedEntry();
        if (selectedEntry) {
            const issuer = document.getElementById('input-issuer').value;
            otpManager.updateEntry(selectedEntry.id, {
                ...selectedEntry,
                issuer: issuer
            });
            renderEntriesList();
        }
    }
}, false);

document.getElementById('input-period').addEventListener('input', () => {
    updateTotpGenerator();
    updateQrCode();
    
    // Update entry when editing period field
    if (!currentlySwitching && isMultiKeyView) {
        const selectedEntry = otpManager.getSelectedEntry();
        if (selectedEntry) {
            const period = document.getElementById('input-period').value;
            otpManager.updateEntry(selectedEntry.id, {
                ...selectedEntry,
                period: period || 30
            });
            renderEntriesList();
        }
    }
}, false);

['click', 'tap'].forEach(event => {
    document.getElementById('totp-token').addEventListener(event, function () {
        copyToClipboard(this.innerText);
        showToast("Token copied!");
    }, false);
});

['click', 'tap'].forEach(event => {
    document.getElementById('otpauth-qr').addEventListener(event, function () {
        const secret = document.getElementById('input-secret').value;
        const account = document.getElementById('input-account').value;
        const issuer = document.getElementById('input-issuer').value;
        const period = document.getElementById('input-period').value;
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

// ################  Multi-key functions  ##################

let searchFilter = '';

function renderEntriesList() {
    const entriesList = document.getElementById('entries-list');
    let entries = otpManager.getAllEntries();
    const selectedEntry = otpManager.getSelectedEntry();
    
    // Apply search filter if active
    if (searchFilter) {
        const filterLower = searchFilter.toLowerCase();
        entries = entries.filter(entry => {
            const account = (entry.account || '').toLowerCase();
            const issuer = (entry.issuer || '').toLowerCase();
            return account.includes(filterLower) || issuer.includes(filterLower);
        });
    }
    
    entriesList.innerHTML = '';
    
    entries.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'otp-entry';
        entryDiv.dataset.entryId = entry.id;
        if (selectedEntry && selectedEntry.id === entry.id) {
            entryDiv.classList.add('selected');
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'otp-entry-info';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'otp-entry-label';
        labelDiv.textContent = entry.issuer || entry.account || 'Unnamed Key';
        infoDiv.appendChild(labelDiv);
        
        // Always create account div for consistent spacing
        const accountDiv = document.createElement('div');
        accountDiv.className = 'otp-entry-account';
        accountDiv.textContent = (entry.account && entry.issuer) ? entry.account : '\u00A0'; // Non-breaking space if empty
        infoDiv.appendChild(accountDiv);
        
        entryDiv.appendChild(infoDiv);
        
        // Token display with timer
        if (entry.generator) {
            try {
                const tokenSpan = document.createElement('div');
                tokenSpan.className = 'otp-entry-token';
                tokenSpan.textContent = formatToken(entry.generator.getToken());
                entryDiv.appendChild(tokenSpan);
                
                // Add timer chart container
                const timerDiv = document.createElement('div');
                timerDiv.className = 'otp-entry-timer';
                
                const timerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                timerSvg.setAttribute('viewBox', '0 0 0.318310 0.318310');
                
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('r', '0.159155');
                circle.setAttribute('cx', '0.159155');
                circle.setAttribute('cy', '0.159155');
                
                const remaining = entry.generator.getRemainingSeconds() / entry.generator.getStepSeconds();
                circle.style.strokeDashoffset = -1 + remaining;
                
                timerSvg.appendChild(circle);
                timerDiv.appendChild(timerSvg);
                entryDiv.appendChild(timerDiv);
            } catch (e) {
                // Invalid secret
            }
        }
        
        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'otp-entry-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'otp-entry-delete';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Delete this key?')) {
                otpManager.deleteEntry(entry.id);
                renderEntriesList();
                
                // If no entries left, create a new empty one
                if (otpManager.getAllEntries().length === 0) {
                    otpManager.addEntry('', '', '', 30);
                    otpManager.selectedId = null;
                    document.getElementById('calculator-container').style.display = 'none';
                } else {
                    // Hide calculator since no entry is selected
                    document.getElementById('calculator-container').style.display = 'none';
                    otpManager.selectedId = null;
                }
            }
        };
        actionsDiv.appendChild(deleteBtn);
        
        entryDiv.appendChild(actionsDiv);
        
        // Click to select/deselect
        entryDiv.onclick = () => {
            const selectedEntry = otpManager.getSelectedEntry();
            const calculatorContainer = document.getElementById('calculator-container');
            
            if (selectedEntry && selectedEntry.id === entry.id) {
                // Deselect if clicking the same entry
                otpManager.selectedId = null;
                calculatorContainer.style.display = 'none';
                renderEntriesList();
            } else {
                // Select the entry
                otpManager.selectEntry(entry.id);
                loadEntryIntoForm(entry);
                calculatorContainer.style.display = 'block';
                renderEntriesList();
            }
        };
        
        entriesList.appendChild(entryDiv);
    });
    
    // Update tokens every second
    updateAllTokens();
}

function updateAllTokens() {
    if (!isMultiKeyView) return;
    
    const entries = otpManager.getAllEntries();
    const entryDivs = document.querySelectorAll('.otp-entry');
    
    entryDivs.forEach((entryDiv) => {
        const entryId = entryDiv.dataset.entryId;
        const entry = entries.find(e => e.id === entryId);
        
        if (entry && entry.generator) {
            const tokenSpan = entryDiv.querySelector('.otp-entry-token');
            const timerCircle = entryDiv.querySelector('.otp-entry-timer svg > circle');
            
            if (tokenSpan) {
                try {
                    tokenSpan.textContent = formatToken(entry.generator.getToken());
                    
                    if (timerCircle) {
                        const remaining = entry.generator.getRemainingSeconds() / entry.generator.getStepSeconds();
                        timerCircle.style.strokeDashoffset = -1 + remaining;
                    }
                } catch (e) {
                    tokenSpan.textContent = '';
                }
            }
        }
    });
}

function loadEntryIntoForm(entry) {
    currentlySwitching = true; // Set flag to prevent updates during loading
    
    document.getElementById('input-secret').value = entry.secret || '';
    document.getElementById('input-account').value = entry.account || '';
    document.getElementById('input-issuer').value = entry.issuer || '';
    document.getElementById('input-period').value = entry.period || 30;
    
    // Update the TOTP generator with the new values
    totpGenerator = entry.secret ? new TOTP(entry.secret, entry.period || 30) : undefined;
    
    // Update displays
    updateTotpToken();
    updateLabel();
    updateQrCode();
    
    currentlySwitching = false; // Reset flag
}

function initializeMultiKeyView() {
    const entriesContainer = document.getElementById('entries-list-container');
    const calculatorContainer = document.getElementById('calculator-container');
    entriesContainer.style.display = 'block';
    
    // Hide calculator by default
    calculatorContainer.style.display = 'none';
    
    // If no entries exist, create an initial empty one but don't select it
    if (otpManager.getAllEntries().length === 0) {
        otpManager.addEntry('', '', '', 30);
        // Don't select the entry - user must click to select
        otpManager.selectedId = null;
    }
    
    renderEntriesList();
}

// Add entry button handler
document.getElementById('add-key-icon').addEventListener('click', () => {
    const calculatorContainer = document.getElementById('calculator-container');
    
    // Save current entry first if it has data
    const currentSecret = document.getElementById('input-secret').value;
    const currentAccount = document.getElementById('input-account').value;
    const currentIssuer = document.getElementById('input-issuer').value;
    const currentPeriod = document.getElementById('input-period').value;
    const selectedEntry = otpManager.getSelectedEntry();
    
    if (selectedEntry && (currentSecret || currentAccount || currentIssuer)) {
        otpManager.updateEntry(selectedEntry.id, {
            secret: currentSecret,
            account: currentAccount,
            issuer: currentIssuer,
            period: currentPeriod || 30
        });
    }
    
    // Add new empty entry
    const newEntry = otpManager.addEntry('', '', '', 30);
    otpManager.selectEntry(newEntry.id); // Explicitly select when user clicks add
    loadEntryIntoForm(newEntry);
    calculatorContainer.style.display = 'block';
    renderEntriesList();
    document.getElementById('input-secret').focus();
});

// Clear all icon handler
document.getElementById('clear-all-icon').addEventListener('click', async () => {
    if (confirm('This will delete all saved keys. Are you sure?')) {
        otpManager.clearAll();
        
        // Create a new empty entry but don't select it
        otpManager.addEntry('', '', '', 30);
        otpManager.selectedId = null;
        
        // Hide calculator since nothing is selected
        document.getElementById('calculator-container').style.display = 'none';
        
        renderEntriesList();
    }
});

// Search input handler
document.getElementById('search-input').addEventListener('input', (event) => {
    searchFilter = event.target.value;
    renderEntriesList();
});

// Export handler
document.getElementById('export-icon').addEventListener('click', async () => {
    const jsonData = await otpManager.exportEntries();
    
    // Create a blob and download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp-keys-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const message = otpManager.isEncrypted ? 
        'Keys exported (encrypted)!' : 
        'Keys exported successfully!';
    showToast(message);
});

// Import icon click handler
document.getElementById('import-icon').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

// Import file handler
document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const importData = e.target.result;
            
            // Try to parse to check if encrypted
            try {
                const parsed = JSON.parse(importData);
                if (otpManager.crypto.isEncrypted(parsed)) {
                    // Need password to decrypt
                    showPasswordPrompt('import', async (password) => {
                        if (!password) {
                            showToast('Import cancelled');
                            return;
                        }
                        
                        const result = await otpManager.importEntries(importData, password);
                        handleImportResult(result);
                    });
                } else {
                    // Not encrypted, import directly
                    const result = await otpManager.importEntries(importData);
                    handleImportResult(result);
                }
            } catch (e) {
                alert(`Import failed: Invalid file format`);
            }
        };
        reader.readAsText(file);
        
        // Reset the input so the same file can be imported again if needed
        event.target.value = '';
    }
});

function handleImportResult(result) {
    if (result.success) {
        renderEntriesList();
        if (result.added > 0) {
            showToast(`Imported ${result.added} keys${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`);
        } else {
            showToast(`All keys already exist (${result.skipped} skipped)`);
        }
    } else {
        alert(`Import failed: ${result.error}`);
    }
}

// ################  run  ##################
if (!Cookies.get("otp-authenticator.darkStyle") && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    Cookies.set("otp-authenticator.darkStyle", "true");
}

if (Cookies.get("otp-authenticator.darkStyle") === "true") {
    toggleDarkMode();
}

updateLabel();
updateTotpToken();
updateQrCode();

setInterval(() => {
    updateTotpToken();
    if (isMultiKeyView) {
        updateAllTokens();
    }
}, 1000);

// Initialize encryption and load data
async function initializeApp() {
    // Check if data is encrypted
    if (otpManager.checkEncryptionStatus()) {
        // Show password prompt
        showPasswordPrompt('unlock');
    } else {
        // Load data without password
        const result = await otpManager.loadFromStorage();
        if (result.success) {
            finalizeInitialization();
        }
    }
}

function finalizeInitialization() {
    isInitialized = true;
    // Initialize multi-key UI
    initializeMultiKeyView();
    
    // Update lock icon state
    updateLockIcon();
    
    // Load the first entry if it exists
    const entries = otpManager.getAllEntries();
    if (entries.length > 0) {
        // Don't auto-select any entry on page load
        // User must click to select
        otpManager.selectedId = null;
    }
}

function showPasswordPrompt(mode, callback) {
    const overlay = document.getElementById('password-overlay');
    const title = document.getElementById('password-title');
    const message = document.getElementById('password-message');
    const input = document.getElementById('password-input');
    const confirmInput = document.getElementById('password-confirm');
    const submitBtn = document.getElementById('password-submit');
    const cancelBtn = document.getElementById('password-cancel');
    const errorDiv = document.getElementById('password-error');
    
    // Clear previous state
    input.value = '';
    confirmInput.value = '';
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // Configure based on mode
    if (mode === 'unlock') {
        title.textContent = 'Enter Password';
        message.textContent = 'Your keys are encrypted. Please enter your password to unlock.';
        submitBtn.textContent = 'Unlock';
        cancelBtn.style.display = 'none';
        confirmInput.style.display = 'none';
    } else if (mode === 'enable') {
        title.textContent = 'Enable Encryption';
        message.textContent = 'Enter a password to encrypt your keys. You will need this password to access your keys.';
        submitBtn.textContent = 'Enable Encryption';
        cancelBtn.style.display = 'inline-block';
        confirmInput.style.display = 'block';
    } else if (mode === 'disable') {
        title.textContent = 'Disable Encryption';
        message.textContent = 'Enter your current password to disable encryption. Your keys will be stored in plain text.';
        submitBtn.textContent = 'Disable Encryption';
        cancelBtn.style.display = 'inline-block';
        confirmInput.style.display = 'none';
    } else if (mode === 'import') {
        title.textContent = 'Import Encrypted Data';
        message.textContent = 'The imported file is encrypted. Enter the password to decrypt it.';
        submitBtn.textContent = 'Import';
        cancelBtn.style.display = 'inline-block';
        confirmInput.style.display = 'none';
    }
    
    overlay.style.display = 'flex';
    input.focus();
    
    // Handle submit
    const handleSubmit = async () => {
        const password = input.value;
        const confirmPassword = confirmInput.value;
        
        if (!password) {
            errorDiv.textContent = 'Please enter a password';
            errorDiv.style.display = 'block';
            return;
        }
        
        // Check password confirmation for enable mode
        if (mode === 'enable') {
            if (!confirmPassword) {
                errorDiv.textContent = 'Please confirm your password';
                errorDiv.style.display = 'block';
                return;
            }
            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                confirmInput.focus();
                return;
            }
            if (password.length < 4) {
                errorDiv.textContent = 'Password must be at least 4 characters';
                errorDiv.style.display = 'block';
                return;
            }
        }
        
        if (mode === 'unlock') {
            const result = await otpManager.loadFromStorage(password);
            if (result.success) {
                overlay.style.display = 'none';
                finalizeInitialization();
            } else if (result.error) {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }
        } else if (mode === 'enable') {
            const result = await otpManager.enableEncryption(password);
            if (result.success) {
                overlay.style.display = 'none';
                updateLockIcon();
                showToast('Encryption enabled');
            }
        } else if (mode === 'disable') {
            const result = await otpManager.disableEncryption(password);
            if (result.success) {
                overlay.style.display = 'none';
                updateLockIcon();
                showToast('Encryption disabled');
            } else if (result.error) {
                errorDiv.textContent = result.error;
                errorDiv.style.display = 'block';
            }
        } else if (mode === 'import' && callback) {
            overlay.style.display = 'none';
            callback(password);
        }
    };
    
    // Event listeners
    submitBtn.onclick = handleSubmit;
    cancelBtn.onclick = () => {
        overlay.style.display = 'none';
        if (callback) callback(null);
    };
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            if (mode === 'enable' && !confirmInput.value) {
                confirmInput.focus();
            } else {
                handleSubmit();
            }
        }
    };
    confirmInput.onkeypress = (e) => {
        if (e.key === 'Enter') handleSubmit();
    };
}

function updateLockIcon() {
    const lockIcon = document.getElementById('lock-icon');
    if (otpManager.isEncrypted) {
        lockIcon.classList.remove('unlocked');
        lockIcon.title = 'Encryption enabled (click to disable)';
    } else {
        lockIcon.classList.add('unlocked');
        lockIcon.title = 'Encryption disabled (click to enable)';
    }
}

// Lock icon handler
document.getElementById('lock-icon').addEventListener('click', () => {
    if (otpManager.isEncrypted) {
        showPasswordPrompt('disable');
    } else {
        showPasswordPrompt('enable');
    }
});

// Initialize the app
initializeApp();


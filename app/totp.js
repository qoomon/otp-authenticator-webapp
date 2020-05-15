const JsSHA = require('jssha/dist/sha1');

const decToHex = (dec) => dec.toString(16);
const hexToDec = (hex) => parseInt(hex, 16);

const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32ToHex = (base32) => {
    let bits = base32.split('')
        .map(char => {
            let val = base32chars.indexOf(char.toUpperCase());
            if (val < 0) {
                throw new Error("Illegal Base32 character: " + char);
            }
            return val;
        })
        .map(val => val.toString(2).padStart(5, '0'))
        .join('');

    return bits.match(/.{4}/g)
        .map(chunk => parseInt(chunk, 2).toString(16))
        .join('');
};

module.exports = function (secretBase32, period) {

    this.secretBase32 = secretBase32;
    this.stepSeconds = Number.isInteger(Number(period)) && Number(period) > 0 ? Number(period) : 30;
    this.tokenLength = 6;

    this.getToken = () => {
        if (secretBase32.length < 16) {
            throw new Error("Secret minimum length is 16, but was only" + secretBase32.length);
        }

        let secretHex = base32ToHex(this.secretBase32);
        if (secretHex.length % 2 !== 0) {
            secretHex += '0';
        }
        let counter = Math.floor(Date.now() / 1000 / this.stepSeconds);
        let counterHex = decToHex(counter);

        let shaObj = new JsSHA("SHA-1", "HEX", {
          hmacKey: { value: secretHex, format: "HEX" }
        });
        shaObj.update(counterHex.padStart(16, "0"));
        let hmac = shaObj.getHMAC("HEX");
        let offset = hexToDec(hmac.slice(-1));
        return String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff')).slice(-this.tokenLength);
    };

    this.getRemainingSeconds = () => this.stepSeconds - (Date.now() / 1000) % this.stepSeconds;
    this.getStepSeconds = () => this.stepSeconds;
};
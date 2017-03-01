/*
  Generates a TOTP code given a secret.
  
  This script requires jsSHA (https://github.com/Caligatio/jsSHA) to work.
  
  Usage: 
  
  var code = getTotpCode(secret);
*/
var jsSHA = require("jssha");
var anyBase = require('any-base');
var decToHex = anyBase(anyBase.DEC, anyBase.HEX);
var hexToDec = anyBase(anyBase.HEX, anyBase.DEC);
var base32ToHex = anyBase("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", anyBase.HEX);
var leftPad = function(str, minLength, pad) {
   if (str.length >= minLength) {
       return str
   }
   return pad.repeat(minLength - str.length) + str;
};

function getTotp(secretBase32){
  var stepSeconds = 30;
  var secretHex = base32ToHex(secretBase32);
  var epochSeconds = Math.floor(new Date().getTime() / 1000.0);
  var timeHex = decToHex(String(Math.floor(epochSeconds / stepSeconds)))
  var timeHexPadded= leftPad(timeHex, 16, '0');  
  var shaObj = new jsSHA("SHA-1", "HEX");
  shaObj.setHMACKey(secretHex, "HEX");
  shaObj.update(timeHexPadded);
  var hmac = shaObj.getHMAC("HEX");
  var offset = hexToDec(hmac.substring(hmac.length - 1));
  var totp = String(hexToDec(hmac.substr(offset * 2, 8)) & hexToDec('7fffffff'));
  return totp.slice(-6);
}

// ################  run  ##################
var secretBase32 = process.argv[2];

var totp = getTotp(secretBase32);

console.log(totp);
module.exports = {

  build: (secret, account, issuer) => {
    return 'otpauth://totp/' + encodeURIComponent(account) + '?secret=' + encodeURIComponent(secret) + '&issuer=' + encodeURIComponent(issuer);
  },

  parse: (otpauthUrlString) => {
    var otpauthUrl = new URL(otpauthUrlString);

    var result = {};

    if (otpauthUrl.searchParams.get('secret')) {
      result.secret = decodeURIComponent(otpauthUrl.searchParams.get('secret'));
    }

    var label = decodeURIComponent(otpauthUrl.pathname.replace(RegExp('^//totp/'), ''));
    if (!label.includes(":")) {
      result.account = label;
    } else {
      result.account = label.split(':')[1];
      result.issuer = label.split(':')[0];
    }
    if (otpauthUrl.searchParams.get('issuer')) {
      result.issuer = decodeURIComponent(otpauthUrl.searchParams.get('issuer'));
    }

    return result;
  }
};
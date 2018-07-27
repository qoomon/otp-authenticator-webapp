module.exports = {

  get: (name) => {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
  },

  set: (name, value) => {
    document.cookie = name + "=" + value + "; path=/";
  }
};
module.exports = {

    get: (name) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
    },

    set: (name, value) => {
        document.cookie = name + "=" + value + "; path=/";
    }
};
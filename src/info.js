var client = require('../libs/httpclient');

exports.getSelfInfo = function (cb) {
    var self = this;
    var url = 'http://s.web2.qq.com/api/get_self_info2?t=' + Date.now();
    client.get(url, function (ret) {
        if (ret.retcode === 0) {
            global.auth_options.nickname = ret.result.nick;
        }
        cb();
    });
};
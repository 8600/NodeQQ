var qqface = require('./qqface');
var client = require('../libs/httpclient');

var isWodi = false;

function hashU(x, K) {
    x += "";
    for (var N = [], T = 0; T < K.length; T++) N[T % 4] ^= K.charCodeAt(T);
    var U = ["EC", "OK"],
    V = [];
    V[0] = x >> 24 & 255 ^ U[0].charCodeAt(0);
    V[1] = x >> 16 & 255 ^ U[0].charCodeAt(1);
    V[2] = x >> 8 & 255 ^ U[1].charCodeAt(0);
    V[3] = x & 255 ^ U[1].charCodeAt(1);
    U = [];
    for (T = 0; T < 8; T++) U[T] = T % 2 == 0 ? N[T >> 1] : V[T >> 1];
    N = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    V = "";
    for (T = 0; T < U.length; T++) {
        V += N[U[T] >> 4 & 15];
        V += N[U[T] & 15]
    }
    return V;
};

exports.sendGroupMsg = function (uin, msg, cb) {
    var params = {
        r: JSON.stringify({
            group_uin: uin,
            content: qqface.getFaceContent(msg),
            clientid: clientid,
            msg_id: client.nextMsgId(),
            psessionid: global.auth_options.psessionid
        })
    };

    client.post({
        url: 'http://d1.web2.qq.com/channel/send_qun_msg2'
    }, params, function(ret) {
        cb && cb(ret);
    });
};

exports.getGroupCode = function (code, cb) {
    if (this.group_code[code]) {
        return cb(this.group_code[code]);
    }
    var self = this;
    var params = {
        r: JSON.stringify({
            vfwebqq: this.auth_options.vfwebqq,
            hash: hashU(this.auth_options.uin, this.auth_options.ptwebqq)
        })
    };

    client.post({
        url: 'http://s.web2.qq.com/api/get_group_name_list_mask2'
    }, params, function (ret) {
        var data = ret.result.gnamelist;
        for (var i in data) {
            var item  = _.pick(data[i], ['code', 'flag', 'gid', 'name']);
            self.group_code[data[i].gid] = item;
        }
        cb(self.group_code[code]);
    });
};

exports.getGroupInfo = function (code, cb) {
    var self = this;
    var options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/get_group_info_ext2?gcode=' + code + '&vfwebqq=' + this.auth_options.vfwebqq + '&t=' + Date.now(),
        headers: {
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        }
    };

    client.url_get(options, function (err, res, data) {
        data = data.result;
        data.mcount = data.minfo.length;
        data = _.pick(data, ['cards', 'ginfo', 'minfo', 'mcount']);
        self.groups[code] = data;
        cb(err, data);
    });
};

exports.groupHandle = function (msg) {
    var self = this;
    var isAt = msg.content.indexOf('@' + global.auth_options.nickname);
    if (isAt > -1) {
        var val = '';
        if (isAt === 1) {
            val = msg.content[3];
        }
        else {
            val = msg.content[1] + msg.content[4];
        }

        // if (val.match('开始谁是卧底(.+?)人局') && !isNaN(val.match('开始谁是卧底(.+?)人局')[1])){
        //     isWodi = true;
        // }
        // else if (val.match('退出谁是卧底')){
        //     isWodi = false;
        // }
        // else {
        var tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(val.trim());
        client.url_get(tuling, function(err, res, info) {
            self.sendGroupMsg(msg.group_code, JSON.parse(info).text);
        });
        // }
        
    }
}
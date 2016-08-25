var async = require('async');
var Log = require('log');
var _ = require('lodash');
var log = new Log('debug');

var client = require('../libs/httpclient');

var login = require('./login');
var group = require('./group');
var buddy = require('./buddy');
var info = require('./info');

var toPoll = false;

exports.onPoll = function (aaa, cb) {
    var params = {
        r: JSON.stringify({
            ptwebqq: global.auth_options.ptwebqq,
            clientid: global.auth_options.clientid,
            psessionid: global.auth_options.psessionid,
            key: ""
        })
    };
    client.post({
        url: "http://d1.web2.qq.com/channel/poll2",
        timeout: 65000
    }, params, function(ret, e) {
        cb(ret);
    });
};

exports.stopPoll = function () {
    toPoll = false;
};

exports.startPoll = function () {
    toPoll = true;
    log.debug('polling...');
    var self = this;
    if (!global.auth_options.nickname) {
        info.getSelfInfo(function(){ 
            self.loopPoll(auth_options);
        })
    }
    else {
        self.loopPoll(auth_options);
    }
    
};

exports.onDisconnect = function () {
    // fixme: 需要重新登录
    var self = this;
    this.stopPoll();
    login._Login(client.get_cookies_string(), function(){
        self.startPoll();
    });
}

exports.loopPoll = function (auth_options) {
    if (!toPoll) return;
    var self = this;
    this.onPoll(auth_options, function (e) {
        self._onPoll(e);
        self.loopPoll();
        // setTimeout(function(){
        //     self.loopPoll();
        // }, e ? 5000 : 0)
    })
};

exports._onPoll = function (ret) {
    if (!ret) return;
    if (typeof ret === 'string') return;
    if (ret.retcode === 102) return;
    if (ret.retcode === 103) {
        log.info('请先登录一下WebQQ!');
        toPoll = false;
        return;
    }
    if (ret.retcode != 0) {
        return this.onDisconnect();
    }
    if (!Array.isArray(ret.result)) return;

    ret.result = ret.result.sort(function (a, b) {
        return a.value.time - b.value.time
    });

    var self = this;

    async.eachSeries(ret.result, function (item, next) {
        _.extend(item, item.value);
        delete item.value;

        if (['input_notify', 'buddies_status_change', 'system_message'].indexOf(item.poll_type) > -1) {
            return next();
        }

        async.waterfall([
            function (next) {
                if (item.group_code) {
                    group.groupHandle(item);
                    next();
                } else if (item.did) {
                    // self.getDiscuInfo(item.did, function(e, d1) {
                    //     d.discu_name = d1.info.discu_name;
                    //     var c = _.find(d1.mem_info, { uin: d.send_uin });
                    //     if (c) d.send_nick = c.nick;
                    //     next();
                    // })
                } else {
                    var tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(item.content[1]);
                    client.url_get(tuling, function(err, res, info) {
                        buddy.sendBuddyMsg(item.from_uin, JSON.parse(info).text, function(ret, e){
                            log.info(ret);
                        });
                    });
                    next();
                }
            }
        ], function (e) {
            // log.debug(e);
        });
    });
    return;
};
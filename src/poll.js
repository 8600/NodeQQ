const async = require('async');
const Log = require('log');
const log = new Log('debug');
const client = require('../libs/httpclient');
const login = require('./login');
const group = require('./group');
const buddy = require('./buddy');
const info = require('./info');

let toPoll = false;

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
    log.info('尝试收取消息');
    let self = this;
    if (!global.auth_options.nickname) {
        info.getSelfInfo(function(){
            self.loopPoll(auth_options);
        });
    }
    else {
        self.loopPoll(auth_options);
    }

};

//重新登录
exports.onDisconnect = function () {
    let self = this;
    this.stopPoll();
    login._Login(client.get_cookies_string(), function(){
        self.startPoll();
    });
};

exports.loopPoll = function (auth_options) {
    if (!toPoll) return;
    let self = this;
    this.onPoll(auth_options, function (e) {
        self._onPoll(e);
        self.loopPoll();
    });
};

//判断消息是群消息还是好友消息
function Processing_Message(ret,item,next){
    if (item.group_code) {
        group.groupHandle(item);
        next();
    }
    else {
        log.info("收到消息:"+item.content[1]);
        let tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(item.content[1]);
        client.url_get(tuling, function(err, res, info) {
            buddy.sendBuddyMsg(item.from_uin, JSON.parse(info).text, function(ret, e){
                log.info("回复消息:"+JSON.parse(info).text);
            });
        });
        next();
    }
}

//接收消息
function message(ret,self){
    ret.result = ret.result.sort(function (a, b) {
        return a.value.time - b.value.time;
    });
    async.eachSeries(ret.result, function (item, next) {
        item=item.value;
        if (['input_notify', 'buddies_status_change', 'system_message'].indexOf(item.poll_type) > -1) return next();
        async.waterfall([function (next) {Processing_Message(ret,item,next);}], function (e) {
            // log.debug(e);
        });
    });
}

exports._onPoll = function (ret) {
    //登录状态验证
    if (!ret) return;
    if (typeof ret === 'string') return;
    switch (ret.retcode) {
      case 0  :if (!Array.isArray(ret.result)) return;message(ret,this);return;
      case 102:return;
      case 103:log.info('请先登录一下WebQQ!');toPoll = false;return;
      default :return this.onDisconnect();
    }
};

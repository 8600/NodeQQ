var _ = require('lodash');
var fs = require('fs');
var async = require('async');
var Log = require('log');

var client = require('./libs/httpclient');

var log = new Log('debug');

var appid = 501004106;
var clientid  = 53999199;
var font = {
  'name': '宋体',
  'size': 10,
  'style': [0, 0, 0],
  'color':  '000000'
}
var codeMap = [14,1,2,3,4,5,6,7,8,9,10,11,12,13,0,50,51,96,53,54,73,74,75,76,77,78,55,56,57,58,79,80,81,82,83,84,85,86,87,88,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,32,113,114,115,63,64,59,33,34,116,36,37,38,91,92,93,29,117,72,45,42,39,62,46,47,71,95,118,119,120,121,122,123,124,27,21,23,25,26,125,126,127,
128,129,130,131,132,133,134,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170]

var z = 0;
var q = Date.now();
q = (q - q % 1E3) / 1E3;
q = q % 1E4 * 1E4;
function nextMsgId() {
    z++;
    return q + z;
}

function sleep(milliSeconds) { 
    var startTime = new Date().getTime(); 
    while (new Date().getTime() < startTime + milliSeconds);
};

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

var QQ = module.exports = function () {
    this.auth_options = {};
    this.toPoll = false;
    this.cookie = null;
    this.groups = {};
    this.group_code = {};
    this.discus = {};
    this.nickname = '';
};

QQ.prototype.getPtwebqq = function (url, cb) {
    client.url_get(url, function(err, res, data){
        if(! err)
            return cb(data);
    });
};

QQ.prototype.prepareLogin = function (callback) {
    var self = this;
    var url = "https://ssl.ptlogin2.qq.com/ptqrshow?appid=501004106&e=0&l=M&s=5&d=72&v=4&t=" + Math.random();

    client.url_get(url, function(err, res, data) {
        fs.writeFile('./code.png', data, 'binary', function (err) {
            if (err) {
                console.log(err);
            }
            else {
                console.log("down success");
                require('child_process').exec('open ./code.png');
                self.waitingScan(callback);
            }
        });
    }, function(res){
        res.setEncoding('binary');
    });
};

QQ.prototype.checkVcode = function (cb) {
    var options = {
        protocol: 'https:',
        host: 'ssl.ptlogin2.qq.com',
        path: '/ptqrlogin?webqq_type=10&remember_uin=1&login2qq=1&aid=' + appid + '&u1=http%3A%2F%2Fw.qq.com%2Fproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=0-0-' + (Math.random() * 900000 + 1000000) +'&mibao_css=m_webqq&t=undefined&g=1&js_type=0&js_ver=10141&login_sig=&pt_randsalt=0',
        headers: {
            'Cookie': client.get_cookies_string(),
            'Referer': 'https://ui.ptlogin2.qq.com/cgi-bin/login?daid=164&target=self&style=16&mibao_css=m_webqq&appid=501004106&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fw.qq.com/proxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20130723001&f_qr=0'
        }
    };

    client.url_get(options, function (err, res, data) {
        var ret = data.match(/\'(.*?)\'/g).map(function (i) {
            var last = i.length - 2;
            return i.substr(1, last);
        });
        cb(ret);
    });
};

QQ.prototype.waitingScan = function (callback) {
    var self = this;
    log.info("登录 step1 等待二维码校验结果");
    self.checkVcode(function (ret) {
        var retCode = parseInt(ret[0]);
        if (retCode === 0 && ret[2].match(/^http/)) {
            require('child_process').exec('rm -rf ./code.png');
            self.nickname = ret[5];
            log.info("登录 step2 cookie 获取 ptwebqq");
            self.getPtwebqq(ret[2], function (ret) {
                self.ptwebqq = client.get_cookies().filter(function (item) {
                    return item.match(/ptwebqq/);
                }).pop().replace(/ptwebqq\=(.*?);.*/, '$1');

                self.Login(self.ptwebqq, function (ret) {
                    if (ret.retcode === 0) {
                        self.vfwebqq = ret.result.vfwebqq;

                        log.info("登录 step4 获取 uin, psessionid");
                        self.loginToken(self.ptwebq, null, function (ret) {
                            if (ret.retcode === 0) {
                                log.info('登录成功');
                                self.auth_options = {
                                    clientid: clientid,
                                    ptwebqq: self.ptwebqq,
                                    vfwebqq: self.vfwebqq,
                                    uin: ret.result.uin,
                                    psessionid: ret.result.psessionid
                                };
                                callback(client.get_cookies(), self.auth_options);
                                self.getSelfInfo(function (ret) {
                                    if (ret.retcode === 0) {
                                        self.nickname = ret.result.nick;
                                    }
                                    log.info(self.nickname);
                                    self.startPoll(self.auth_options);
                                });
                            }
                            else {
                                log.info("登录失败");
                                return log.error(ret);
                            }
                        });
                    }
                });
            });
        }
        else if (retCode === 66 || retCode === 67) {
            sleep(1000);
            self.waitingScan(callback);
        }
        else {
            log.error("登录 step1 failed", ret);
            return;
        }
    });
};

QQ.prototype.loginToken = function (ptwebqq, psessionid, cb) {
    if (!psessionid) psessionid = null;
    var form = {
        r: JSON.stringify({
            ptwebqq: ptwebqq,
            clientid: clientid,
            psessionid: psessionid || "",
            status: "online"
        })
    };
    client.url_post({
        protocol: 'http:',
        host: 'd1.web2.qq.com',
        path: '/channel/login2',
        method: 'POST',
        headers: {
            'Origin': 'http://d1.web2.qq.com',
            'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        }
    }, form, function (err, res, data) {
        var ret = JSON.parse(data);
        cb(ret);
    });
};

QQ.prototype.Login = function (ptwebqq, cb) {
    log.info("登录 step3 获取 vfwebqq");
    var options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/getvfwebqq?ptwebqq=' + ptwebqq + '&clientid=' + clientid + '&psessionid=&t=' + Math.random(),
        headers: {
            'Cookie': client.get_cookies_string(),
            'Origin': 'http://s.web2.qq.com',
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        }
    };
    client.url_get(options, function (err, res, data) {
        var ret = JSON.parse(data);
        cb(ret);
    });
};


QQ.prototype._Login = function (cookie, callback) {
    var self = this;

    log.info("自动登录");
    this.ptwebqq = cookie.match(/ptwebqq=(.+?);/)[1];

    client.set_cookies(cookie);

    this.Login(this.ptwebqq, function (ret){
        if (ret.retcode === 0) self.vfwebqq = ret.result.vfwebqq;
        self.loginToken(self.ptwebqq, null, function (ret) {
            if (ret.retcode === 0) {
                log.info('登录成功');
                if (!ret.result) {
                    require('child_process').exec('rm -rf cookie.data')
                    self.prepareLogin(callback);
                    return;
                }

                self.auth_options = {
                    clientid: clientid,
                    ptwebqq: self.ptwebqq,
                    vfwebqq: self.vfwebqq,
                    uin: ret.result.uin,
                    psessionid: ret.result.psessionid
                };
                // callback(client.get_cookies(), self.auth_options);
                self.startPoll(self.auth_options);
                self.getSelfInfo(function (ret) {
                    if (ret.retcode === 0) {
                        self.nickname = ret.result.nick;
                    }
                });
            }
            else {
                log.info("登录失败");
                return log.error(ret);
            }
        });
    });
};

QQ.prototype.getAuth = function() {
    return this.auth_options;
};

QQ.prototype.onPoll = function (aaa, cb) {
    var params = {
        r: JSON.stringify({
            ptwebqq: this.auth_options.ptwebqq,
            clientid: this.auth_options.clientid,
            psessionid: this.auth_options.psessionid,
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

QQ.prototype.stopPoll = function () {
    this.toPoll = false;
};

QQ.prototype.startPoll = function (auth_options) {
    this.toPoll = true;
    log.debug('polling...');
    this.loopPoll(auth_options);
};

QQ.prototype.onDisconnect = function () {
    // fixme: 需要重新登录
    this.stopPoll();
    this._Login(this.cookie);
}

QQ.prototype.loopPoll = function (auth_options) {
    if (!this.toPoll) return;
    var self = this;
    this.onPoll(auth_options, function (e) {
        self._onPoll(e);
        self.loopPoll();
        // setTimeout(function(){
        //     self.loopPoll();
        // }, e ? 5000 : 0)
    })
};

QQ.prototype._onPoll = function (ret) {
    if (!ret) return;
    if (typeof ret === 'string') return;
    if (ret.retcode === 102) return;
    if (ret.retcode === 103) {
        log.info('请先登录一下WebQQ!');
        this.toPoll = false;
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

        // log.debug('接收消息', item);
        if (['input_notify', 'buddies_status_change', 'system_message'].indexOf(item.poll_type) > -1) {
            return next();
        }
        // if (![45, 43, 42, 9].indexOf(item.msg_type) > -1) {
        //     log.debug('未知消息类型', item);
        //     return next();
        // };
        async.waterfall([
            function (next) {
                if (item.group_code) {
                    var isAt = item.content.indexOf('@' + self.nickname);
                    if (isAt > -1) {
                        var val = '';
                        if (isAt === 1) {
                            val = item.content[3];
                        }
                        else {
                            val = item.content[1] + item.content[4];
                        }
                        
                        var tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(val.trim());
                        client.url_get(tuling, function(err, res, info) {
                            self.sendGroupMsg(item.group_code, JSON.parse(info).text, function(ret, e){
                                // log.info('回复'+ret.result[0].value.from_ui+'成功');
                                // log.info(ret);
                            });
                        });
                    }
                    next();
                    // self.getGroupInfo(item.group_code, function(data) {
                    //     // log.debug(data.code);
                    //     // if (!data.gid === 1853079463){
                    //     if (item.content[3]) {
                    //         var tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(item.content[3]);
                    //         client.url_get(tuling, function(err, res, info) {
                    //             self.sendGroupMsg(item.group_code, JSON.parse(info).text, function(ret, e){
                    //                 // log.info('回复'+ret.result[0].value.from_ui+'成功');
                    //                 log.info(ret);
                    //             });
                    //         });
                    //     }
                    //     next();
                    // })
                } else if (item.did) {
                    self.getDiscuInfo(item.did, function(e, d1) {
                        d.discu_name = d1.info.discu_name;
                        var c = _.find(d1.mem_info, { uin: d.send_uin });
                        if (c) d.send_nick = c.nick;
                        next();
                    })
                } else {
                    var tuling = 'http://www.tuling123.com/openapi/api?key=873ba8257f7835dfc537090fa4120d14&info=' + encodeURI(item.content[1]);
                    client.url_get(tuling, function(err, res, info) {
                        self.sendBuddyMsg(item.from_uin, JSON.parse(info).text, function(ret, e){
                            // log.info('回复'+ret.result[0].value.from_ui+'成功');
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

QQ.prototype.sendBuddyMsg = function (uin, msg, cb) {
    var params = {
        r: JSON.stringify({
            to: uin,
            face: 522,
            content: this.getFaceContent(msg),
            clientid: clientid,
            msg_id: nextMsgId(),
            psessionid: this.auth_options.psessionid
        })
    };
    log.debug(params);
    // return;
    client.post({
        url: 'http://d1.web2.qq.com/channel/send_buddy_msg2'
    }, params, function(ret) {
        cb(ret);
    });
};

QQ.prototype.sendGroupMsg = function (uin, msg, cb) {
    var params = {
        r: JSON.stringify({
            group_uin: uin,
            content: this.getFaceContent(msg),
            clientid: clientid,
            msg_id: nextMsgId(),
            psessionid: this.auth_options.psessionid
        })
    };
    log.debug(params);
    client.post({
        url: 'http://d1.web2.qq.com/channel/send_qun_msg2'
    }, params, function(ret) {
        cb(ret);
    });
};

QQ.prototype.getGroupCode = function (code, cb) {
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

QQ.prototype.getGroupInfo = function (code, cb) {
    var self = this;
    this.getGroupCode(code, cb);
    // self.getGroupCode(code, function (gcode) {
    //     if (self.groups[gcode]) {
    //         return cb(null, self.groups[gcode]);
    //     }
    //     var options = {
    //         method: 'GET',
    //         protocol: 'http:',
    //         host: 's.web2.qq.com',
    //         path: '/api/get_group_info_ext2?gcode=' + gcode + '&vfwebqq=' + this.auth_options.vfwebqq + '&t=' + Date.now(),
    //         headers: {
    //             'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
    //         }
    //     };

    //     client.url_get(options, function (err, res, data) {
    //         data = data.result;
    //         data.mcount = data.minfo.length;
    //         data = _.pick(data, ['cards', 'ginfo', 'minfo', 'mcount']);
    //         self.groups[gcode] = data;
    //         cb(err, data);
    //     });
    // });
};

QQ.prototype.getDiscuInfo = function (did, cb) {
    if (this.discus[did]) {
        return cb(null, this.discus[did]);
    }
    var self = this;
    var options = {
        method: 'GET',
        protocol: 'http:',
        host: 'd.web2.qq.com',
        path: '/channel/get_discu_info?did=' + did + '&vfwebqq=' + this.auth_options.vfwebqq + '&clientid=' + clientid + '&t=' + Date.now(),
        headers: {
            'Referer': 'http://d.web2.qq.com/proxy.html?v=20130916001&callback=1&id=2',
        }
    };

    client.url_get(options, function (err, res, data) {
        data = data.result
        data.mcount = data.mem_info.length
        data = _.pick(data, ['info', 'mem_info', 'mcount'])
        self.discus[did] = data
        cb(err, data)
    });
};

QQ.prototype.getSelfInfo = function (cb) {
    var self = this;
    var url = 'http://s.web2.qq.com/api/get_self_info2?t=' + Date.now();
    client.get(url, function (ret) {
        cb(ret);
    });
};

QQ.prototype.getFaceContent = function (msg) {
    var content;
    if (Math.random() > 0.5) {
        content = JSON.stringify(['' + msg, ['face', Math.floor(Math.random() * codeMap.length)], ['font', font]]);
    }
    else {
        content = JSON.stringify(['' + msg, ['font', font]]);
    }
    return content;
}

QQ.prototype.Robot = function (callback) {
    var self = this;

    fs.exists('./cookie.data', function (isExist) {
        if (isExist) {
            fs.readFile('./cookie.data', 'utf8', function (err, data){
                self.cookie = data;
                self._Login(data, callback);
            });
        }
        else {
            self.prepareLogin(callback);
        }
    });
};
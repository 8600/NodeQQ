const file = require('fs');
const login = require('./login');
const poll = require('./poll');

//QQ登陆全局配置
global.appid = 501004106;
global.clientid  = 53999199;
global.font = {'name': '宋体','size': 10,'style': [0, 0, 0],'color':  '000000'};

let QQ = module.exports = function () {
    this.auth_options = {};
    this.toPoll = false;
    this.cookie = null;
    this.groups = {};
    this.group_code = {};
    this.discus = {};
    this.nickname = '';
};

QQ.prototype.Login = function (cb) {
    //检查是否有缓存
    file.exists('./cookie.data', function (isExist) {
        if (isExist) {
            file.readFile('./cookie.data', 'utf-8', function (err, data) {
                login._Login(data, function(){
                    poll.startPoll();
                });
            });
        }
        else {
            login.Login(function(){
                poll.startPoll();
            });
        }
    });
};

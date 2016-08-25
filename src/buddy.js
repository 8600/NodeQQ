var qqface = require('./qqface');
var client = require('../libs/httpclient');

exports.sendBuddyMsg = function (uin, msg, cb) {
    var params = {
        r: JSON.stringify({
            to: uin,
            face: 522,
            content: qqface.getFaceContent(msg),
            clientid: global.clientid,
            msg_id: client.nextMsgId(),
            psessionid: global.auth_options.psessionid
        })
    };

    client.post({
        url: 'http://d1.web2.qq.com/channel/send_buddy_msg2'
    }, params, function(ret) {
        cb(ret);
    });
};
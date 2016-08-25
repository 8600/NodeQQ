var fs = require('fs');
var QQ = require('./src/QQ');
var qq = new QQ();
qq.Login(function(a){
    console.log(global.auth_options);
});

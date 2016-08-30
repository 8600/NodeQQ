const QQ = require('./src/QQ');
const qq = new QQ();
//程序的入口
qq.Login(function(a){
    console.log(global.auth_options);
});

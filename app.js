let QQ = require('./src/QQ');
let qq = new QQ();
qq.Login(function(a){
    console.log(global.auth_options);
});

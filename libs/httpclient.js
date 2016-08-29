const _ = require('lodash');
const https = require("https");
const http = require('http');
const querystring = require('querystring');
const URL = require('url');

let all_cookies = [];
let z = 0;
let q = Date.now();
q = (q - q % 1E3) / 1E3;
q = q % 1E4 * 1E4;
let nextMsgId = function () {
    z++;
    return q + z;
};

let get_cookies = function() {
    return all_cookies;
};

let get_cookies_string = function() {
    let cookie_map = {};
    all_cookies.forEach(function (ck) {
        let v = ck.split(' ')[0];
        let kv = v.trim().split('=');
        if(kv[1]!=';') cookie_map[kv[0]] = kv[1];
    });
    let cks = [];
    for(let k in cookie_map) {
        cks.push(k + '=' + cookie_map[k]);
    }
    return cks.join(' ');
};

let set_cookies = function(cks) {
    let ck = [];
    cks.replace('; ,', ';,').split(';,').forEach(function (item, i) {
        if (i != cks.split(';,').length - 1) item += ';';
        ck.push(item);
    });
    update_cookies(ck);
};

let update_cookies = function(cks) {
    if (cks) {
        all_cookies = _.union(all_cookies, cks);
    }
};

let global_cookies = function(cookie) {
  if (cookie) {
      update_cookies(cookie);
  }
  return get_cookies();
};

let url_get = function(url_or_options, callback, pre_callback) {
    let http_or_https = http;

    if( ((typeof url_or_options === 'string') && (url_or_options.indexOf('https:') === 0)) || ((typeof url_or_options === 'object') && (url_or_options.protocol === 'https:')) )
        http_or_https = https;

    if(process.env.DEBUG) {
        console.log(url_or_options);
    }
    return http_or_https.get(url_or_options, function(resp){
        if(pre_callback !== undefined) pre_callback(resp);

        update_cookies(resp.headers['set-cookie']);

        let res = resp;
        let body = '';
        resp.on('data', function(chunk) {
            return body += chunk;
        });
        return resp.on('end', function() {
            if(process.env.DEBUG) {
                console.log(resp.statusCode);
                console.log(resp.headers);
                console.log(body);
            }
            return callback(0, res, body);
        });
    }).on("error", function(e) {
        return console.log(e);
    });
};

let url_post = function(options, form, callback) {
    let http_or_https = http;

    if( ((typeof options === 'object') && (options.protocol === 'https:')) )
        http_or_https = https;

    let postData = querystring.stringify(form);
    if(typeof options.headers !== 'object') options.headers = {};
    options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    options.headers['Content-Length'] = Buffer.byteLength(postData);
    options.headers.Cookie = get_cookies_string();
    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.9; rv:27.0) Gecko/20100101 Firefox/27.0';
    if(process.env.DEBUG) {
        console.log(options.headers);
        console.log(postData);
    }
    if (options.timeout) {
        http_or_https.request(options.timeout, function(){

        });
    }
    let req = http_or_https.request(options, function(resp) {
        let res = resp;
        let body = '';
        resp.on('data', function(chunk) {
            return body += chunk;
        });
        return resp.on('end', function() {
            if(process.env.DEBUG) {
                console.log(resp.statusCode);
                console.log(resp.headers);
                console.log(body);
            }
        return callback(0, res, body);
        });
    }).on("error", function(e) {
        return console.log(e);
    });
    req.write(postData);
    return req.end();
};

let http_request = function(options, params, callback) {
    let append, aurl, body, client, data, query, req;
    aurl = URL.parse(options.url);
    options.host = aurl.host;
    options.path = aurl.path;
    options.headers || (options.headers = {});
    client = aurl.protocol === 'https:' ? https : http;
    body = '';
    if (params && options.method === 'POST') {
        data = querystring.stringify(params);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        options.headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (params && options.method === 'GET') {
        query = querystring.stringify(params);
        append = aurl.query ? '&' : '?';
        options.path += append + query;
    }
    options.headers['Cookie'] = get_cookies_string();
    options.headers['Referer'] = 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2';
    //options.headers['Referer'] = 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1';
    options.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36';
    if(process.env.DEBUG) {
        console.log(options);
        console.log(params);
    }
    req = client.request(options, function(resp) {
      if (options.debug) {
          console.log("response: " + resp.statusCode);
          console.log("cookie: " + resp.headers['set-cookie']);
      }
      resp.on('data', function(chunk) {
          return body += chunk;
      });
      return resp.on('end', function() {
          if(process.env.DEBUG) {
              console.log(resp.statusCode);
              console.log(resp.headers);
              console.log(body);
          }
          return handle_resp_body(body, options, callback);
      });
    });
    req.on("error", function(e) {
        return callback(null, e);
    });
    if (params && options.method === 'POST') {
        req.write(data);
    }
    return req.end();
};

let handle_resp_body = function(body, options, callback) {
    let ret = null;
    try {
        ret = JSON.parse(body);
    } catch (err) {
        console.log("解析出错", options.url, body);
        return callback(null, err);
    }
    return callback(ret, null);
};

let http_get = function(url, params, callback) {
    if (!callback) {
        callback = params;
        params = null;
    }
    let options = {
        method: 'GET',
        url: url
    };
    return http_request(options, params, callback);
};

let http_post = function(options, body, callback) {
    options.method = 'POST';
    return http_request(options, body, callback);
};

module.exports = {
    global_cookies: global_cookies,
    get_cookies: get_cookies,
    set_cookies: set_cookies,
    update_cookies: update_cookies,
    get_cookies_string: get_cookies_string,
    request: http_request,
    get: http_get,
    post: http_post,
    url_get: url_get,
    url_post: url_post,
    nextMsgId: nextMsgId
};

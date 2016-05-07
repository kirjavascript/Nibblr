var url = require("url");
var http = require("http");
var express = require('express');
var app = express();

module.exports = function(client, db, config) {

    // http://kirjava.xyz:8888/?say=1&users=%238bitvape&message=test

    // var server = http.createServer((req, res) => {
    //     req = url.parse(req.url, true);

    //     if(req.query.users && req.query.message) {
    //         res.end('sent ' + req.query.message + ' to ' + req.query.users);

    //         var action = req.query.say ? 'say' : 'notice';

    //         req.query.users.split(',').forEach(d => {
    //             client[action](d, req.query.message);
    //         })
    //     }

    // });

    // server.listen(config.serverport, () => console.log('notify server listening'))

    app.get('/api/say', (req,res) => {
        req = url.parse(req.url, true);

        if(req.query.user && req.query.message) {
            res.send('sent message ' + req.query.message + ' to ' + req.query.user);

            req.query.user.split(',').forEach(d => {
                client.say(d, req.query.message);
            })
        }
    })

    app.get('/api/notice', (req,res) => {
        req = url.parse(req.url, true);

        if(req.query.user && req.query.message) {
            res.send('sent notice ' + req.query.message + ' to ' + req.query.user);

            req.query.user.split(',').forEach(d => {
                client.notice(d, req.query.message);
            })
        }
    })



    app.get('/', function (req, res) {
      res.send('Hello World!');
    });

    app.listen(config.serverport, function () {
        console.log('Web server listening on ' + config.serverport);
    });


}
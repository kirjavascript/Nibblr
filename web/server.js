// http://expressjs.com/en/4x/api.html#req

var fs = require('fs');
var url = require("url");
var express = require('express');
var session = require('express-session');
var Markdown = require('markdown-to-html').Markdown;
var app = express();

var config = require('../config.json');
var socket = require('./socket.js');
    

module.exports = function(obj) {

    // config

    var server = app.engine('html', require('hogan-express'))
            .set('view engine', 'html')
            .set('views', __dirname + '/templates')
            .set('layout', 'layout')
            .use(session({
                secret: 'Welivelongandarecelebratedpoopers',
                cookie: { maxAge: 60000 },
                resave: true,
                saveUninitialized: true
            }))
            .listen(config.webInterface.port, function () {
            console.log('Web server listening on ' + config.webInterface.port)
        })

    // init

    api(obj);
    site(obj);
    socket({server, client: obj.client})

    // root

    app.use('/', express.static('./web/static'))

    app.get('/', (req,res) => {
        res.render('index', conf({config}, req))
    })    

}

function conf(extra = {}, req) {

    let session = req.session

    return Object.assign({

        admin: session.admin,

    }, extra)
}

function site(obj) {

    app.get('/login', (req,res) => {
        if(req.query.pass == config.webInterface.password) {
            req.session.admin = true;
            res.json({success:true})
        }
        else {
            res.json({success:false})
        }
    })

    app.get('/help', (req,res) => {

        var md = new Markdown();
        md.bufmax = 2048;
        var fileName = __dirname + '/../README.md';

        md.render(fileName, {}, function(err) {
            if (!err) {
                res.render('help', conf({help:md.html}, req))
            }
        });
    })

}

function api(obj) {

    app.get('/commands', (req,res) => {
        obj.db.all('SELECT * from commands', (e,r) => {
            res.render('commands', conf({commands: r}, req))
        })
    })

    app.get(/\/api\/command\/(.*)/, (req,res) => {

        var command = req.path.split('/').pop();

        obj.db.all('SELECT * from commands where name = ?', command, (e,r) => {

            res.json(r);
        })
    })

    app.get('/api/say', (req,res) => {
        req = url.parse(req.url, true);

        if(req.query.user && req.query.message) {
            res.json({
                status:"success",
                type:"message",
                message: req.query.message,
                user: req.query.user.split(',')
            });

            req.query.user.split(',').forEach(d => {
                obj.client.say(d, req.query.message);
            })
        }
        else {
            res.json({
                status: "error",
                error: "malformed input, syntax is ?user=username&message=hello"
            });
        }
    })

    app.get('/api/notice', (req,res) => {
        req = url.parse(req.url, true);

        if(req.query.user && req.query.message) {
            res.json({
                status:"success",
                type:"notice",
                message: req.query.message,
                user: req.query.user.split(',')
            });

            req.query.user.split(',').forEach(d => {
                obj.client.notice(d, req.query.message);
            })
        }
        else {
            res.json('?user=username&message=hello');
        }
    })

}
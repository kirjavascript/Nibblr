// http://expressjs.com/en/4x/api.html#req

var url = require("url");
var config = require('../config.json');
var express = require('express');
var app = express();

// app.use(express.cookieParser());
// app.use(express.session({secret: 'Welivelongandarecelebratedpoopers'}));

app.engine('html', require('hogan-express'))
    .set('view engine', 'html')
    .set('views', __dirname + '/templates')
    .set('layout', 'layout')
    .listen(config.webInterface.port, function () {
        console.log('Web server listening on ' + config.webInterface.port);
    });

module.exports = function(obj) {

    // init

    api(obj);

    // root

    app.use('/', express.static('./web/static'));

    app.get('/', (req,res) => {
        res.render('index', conf({config}))
    })

    app.get('/login', (req,res) => {

    })

}

function conf(extra) {

    extra = extra || {};

    return Object.assign({
        user: 'test',
        // partials: {
        //     header: 'partials/header'
        // }
    }, extra)
}

function api(obj) {

    app.get('/commands', (req,res) => {
        obj.db.all('SELECT * from commands', (e,r) => {
            res.render('commands', conf({commands: r}))
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
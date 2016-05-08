var fs = require('fs');
var url = require("url");
var express = require('express');
var session = require('express-session');
var Markdown = require('markdown-to-html').Markdown;
var app = express();

var config = require('../config.json');
var socket = require('./socket');
    

module.exports = function(obj) {

    // config

    var server = app.engine('html', require('hogan-express'))
            .set('view engine', 'html')
            .set('views', __dirname + '/templates')
            .set('layout', 'layout')
            .use(session({
                secret: config.webInterface.secretKey,
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

    let session = req.session;

    let obj = {
        admin: session.admin ? session.admin : false,
        secretKey: session.admin ? `'${config.webInterface.secretKey}'` : false,
    }

    return Object.assign(obj, extra);
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

    app.get('/logout', (req,res) => {
        req.session.admin = false;
        res.json({success:true})
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

    app.get('/commands', (req,res) => {
        res.render('commands', conf({}, req))
    })

}

function api(obj) {

    app.get(/\/api\/command\/(.*)/, (req,res) => {

        var command = req.path.split('/').pop();

        obj.db.all('SELECT * from commands where name = ?', command, (e,r) => {

            res.json(r);
        })
    })

    app.get('/api/commands', (req,res) => {

        obj.db.all('SELECT * from commands ORDER BY name asc', (e,r) => {
            res.json(r)
        })

    })

    app.get('/api/commands/lock', (req,res) => {

        if(checkKey(req) && req.query.name) {
            obj.db.run('UPDATE commands SET locked = "true" WHERE name = ?',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/unlock', (req,res) => {

        if(checkKey(req) && req.query.name) {
            obj.db.run('UPDATE commands SET locked = "false" WHERE name = ?',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/delete', (req,res) => {

        let sql = 'DELETE FROM commands WHERE name = ?'

        if(checkKey(req) && req.query.name) {
            obj.db.run(sql, req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else if (req.query.name) {
            obj.db.run(sql + ' AND locked = "false"',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/rename', (req,res) => {

        let sql = 'UPDATE commands SET name = ? WHERE name = ?';

        if(checkKey(req) && req.query.name && req.query.new) {
            obj.db.run(sql,
                [req.query.new, req.query.name],
                (e,r) => {res.json({status:"success"})
            })
        }
        else if (req.query.name && req.query.new) {
            obj.db.run(sql + ' AND locked = "false"',
                [req.query.new, req.query.name],
                (e,r) => {res.json({status:"success"})}
            )
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/edit', (req,res) => {

        let sql = 'UPDATE commands SET command = ? WHERE name = ?';

        if(checkKey(req) && req.query.name && req.query.command) {
            obj.db.run(sql,
                [decodeURIComponent(req.query.command), req.query.name],
                (e,r) => {res.json({status:"success"})
            })
        }
        else if (req.query.name && req.query.command) {
            obj.db.run(sql + ' AND locked = "false"',
                [decodeURIComponent(req.query.command), req.query.name],
                (e,r) => {res.json({status:"success"})}
            )
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/say', (req,res) => {
        req = url.parse(req.url, true);

        if(checkKey(req) && req.query.message) {

            if(!req.query.user) {
                req.query.user = config.channel;
            }

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
            var error = {
                status: "error",
                message: "malformed input; syntax is ?user=username&message=hello&key=[key]"
            };
            if(!checkKey(req)) {
                error.message += ', Invalid API Key';
            }
            res.json(error);
        }
    })

    app.get('/api/notice', (req,res) => {
        req = url.parse(req.url, true);

        if(checkKey(req) && req.query.message) {

            if(!req.query.user) {
                req.query.user = config.channel;
            }

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
            var error = {
                status: "error",
                message: "malformed input; syntax is ?user=username&message=hello&key=[key]"
            };
            if(!checkKey(req)) {
                error.message += ', Invalid API Key';
            }
            res.json(error);
        }
    })

}

function checkKey(req) {
    if(req.query.key && req.query.key == config.webInterface.secretKey)
        return true;
    else 
        return false;
}
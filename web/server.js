var fs = require('fs');
var url = require("url");
var express = require('express');
var session = require('express-session');
var Markdown = require('markdown-to-html').Markdown;
var favicon = require('serve-favicon');
var app = express();

var config = require('../config.json');
var socket = require('./socket');
    

module.exports = function(obj) {

    // config

    var server = app.engine('html', require('hogan-express'))
            .set('view engine', 'html')
            .set('views', __dirname + '/templates')
            .set('layout', 'layout')
            .use(favicon('web/static/favicon.ico'))
            .use(session({
                secret: config.webInterface.secretKey,
                cookie: { maxAge: null },
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

    app.use('/', express.static('web/static'))

    app.get('/', (req,res) => {
        res.render('livechat', conf({config}, req))
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

    app.get('/about', (req,res) => {

        var md = new Markdown();
        md.bufmax = 2048;
        var fileName = __dirname + '/../README.md';

        md.render(fileName, {}, function(err) {
            if (!err) {
                res.render('about', conf({about:md.html}, req))
            }
        });
    })

    app.get('/commands', (req,res) => {
        res.render('commands', conf({}, req))
    })

    app.get('/config', (req,res) => {

        if(req.session.admin) {
            res.render('config', conf({
                config: JSON.stringify(config, null, 4)
            }, req))
        }
        else {
            res.render('about', conf({}, req))
        }
    })

    app.get('/logs', (req,res) => {
        res.render('logs', conf({}, req))
    })

    app.get('/stats', (req,res) => {
        res.render('stats', conf({}, req))
    })
}

function checkKey(req) {
    if(req.query.key && req.query.key == config.webInterface.secretKey)
        return true;
    else 
        return false;
}


function api(obj) {

    // config

    app.get('/api/config', (req,res) => {

        if(checkKey(req) && req.query.config) {

            try {
                config = JSON.parse(req.query.config);
                fs.writeFile("config.json", req.query.config,"utf-8", function(err) {
                    if(err) {
                        return {status:"file error"};
                    }
                    res.json({status:"success"})
                });
            }
            catch (e) { res.json({status:"json error"}) }

        }
        else { res.json({status:"error"}) }

    })

    // commands

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

    app.get('/api/commands/add', (req,res) => {

        if(req.query.name && req.query.command) {
            obj.db.run('INSERT INTO commands(name,command) VALUES (?,?)',
                [req.query.name, req.query.command], 
                (e,r) => {
                    if (e) res.json({status:e})
                    else res.json({status:"success"})
                }
            )
        }
        else { res.json({status:"error"}) }

    })

    // kick

    app.get('/api/kick', (req,res) => {
        req = url.parse(req.url, true);

        if(checkKey(req) && req.query.user) {

            let channel = req.query.channel || config.channel;

            res.json({});

            obj.client.send('KICK', channel, req.query.user, '\u000304(╯°□°）╯︵ ┻━┻');
            
        }
        else {
            res.json({status:"error"});
        }
    })

    // kick

    app.get('/api/mode', (req,res) => {

        if(checkKey(req) && req.query.user && req.query.mode) {

            let channel = req.query.channel || config.channel;

            res.json({});

            obj.client.send('MODE', channel, req.query.mode, req.query.user);
            
        }
        else {
            res.json({status:"error"});
        }
    })

    // log 



    app.get('/api/log', (req,res) => {

        if (req.query.id) {
            obj.log.all('SELECT * from LOG WHERE id < ? ORDER BY id DESC LIMIT ?', 
                [req.query.id, req.query.limit],
                (e,r) => {
                    res.json(r);
                })
        }
        else {
            obj.log.all('SELECT * from LOG ORDER BY id DESC LIMIT ?', 
                req.query.limit,
                (e,r) => {
                    res.json(r);
                })
        }
        
    })

    app.get('/api/log/freq', (req,res) => {

        obj.log.all('SELECT USER, count(*) from LOG group by user COLLATE NOCASE ASC', 
            (e,r) => {
                res.json(r);
            })
        
    })


    // live chat

    app.get('/api/say', (req,res) => {

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


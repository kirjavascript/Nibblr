var fs = require('fs');
var url = require("url");
var express = require('express');
var session = require('express-session');
var favicon = require('serve-favicon');
var app = express();

var config = require('../index').config;
var socket = require('./socket');
var log = require('../index').log;
var db = require('../index').db;
var commands = require('../modules/hardcommands').commands;

hardCommandArray = Object.keys(commands).map(d => ({
    name: d,
    command: `\/\/ Internal use only\n\n    ` + commands[d].toString(),
    locked: true,
    hard: true,
}))

var d3q = require('d3-queue');

module.exports = function(client) {

    // config

    var server = app.set('view engine', 'ejs')
            .use(require('express-ejs-layouts'))
            .set('views', __dirname + '/templates')
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

    api(client);
    site(client);
    socket({server, client})

    // root

    app.use('/', express.static('web/static'))

    app.get(['/', '/channel'], (req,res) => {
        res.render('livechat', conf({}, req))
    })    

}

function conf(extra = {}, req) {

    let session = req.session;

    let obj = {
        admin: session.admin ? session.admin : false,
        secretKey: session.admin ? `'${config.webInterface.secretKey}'` : false,
        delimiter: '?'
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

    app.get('/commands', (req,res) => {
        res.render('commands', conf({}, req))
    })

    app.get('/filesharing', (req,res) => {
        res.render('filesharing', conf({}, req))
    })

    app.get('/config', (req,res) => {

        if(req.session.admin) {
            res.render('config', conf({
                config: JSON.stringify(config, null, 4)
            }, req))
        }
        else {
            res.render('livechat', conf({}, req))
        }
    })

    app.get(['/logs/:text', '/logs'], (req,res) => {

        res.render('logs', conf({
            text:req.params.text
        }, req))
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

        db.all('SELECT * from commands where name = ?', command, (e,r) => {

            res.json(r);
        })
    })

    app.get('/api/commands', (req,res) => {

        db.all('SELECT * from commands ORDER BY name asc', (e,r) => {
            res.json(r.concat(hardCommandArray).sort((a,b) => (a.name > b.name) ? 1 : (b.name > a.name) ? -1 : 0))
        })

    })

    app.get('/api/commands/lock', (req,res) => {

        if(checkKey(req) && req.query.name) {
            db.run('UPDATE commands SET locked = "true" WHERE name = ?',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/unlock', (req,res) => {

        if(checkKey(req) && req.query.name) {
            db.run('UPDATE commands SET locked = "false" WHERE name = ?',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/delete', (req,res) => {

        let sql = 'DELETE FROM commands WHERE name = ?'

        if(checkKey(req) && req.query.name) {
            db.run(sql, req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else if (req.query.name) {
            db.run(sql + ' AND locked = "false"',req.query.name, (e,r) => {
                res.json({status:"success"})
            })
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/rename', (req,res) => {

        let sql = 'UPDATE commands SET name = ? WHERE name = ?';

        if(checkKey(req) && req.query.name && req.query.new) {
            db.run(sql,
                [req.query.new, req.query.name],
                (e,r) => {res.json({status:"success"})
            })
        }
        else if (req.query.name && req.query.new) {
            db.run(sql + ' AND locked = "false"',
                [req.query.new, req.query.name],
                (e,r) => {res.json({status:"success"})}
            )
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/edit', (req,res) => {

        let sql = 'UPDATE commands SET command = ? WHERE name = ?';

        if(checkKey(req) && req.query.name && req.query.command) {
            db.run(sql,
                [decodeURIComponent(req.query.command), req.query.name],
                (e,r) => {res.json({status:"success"})
            })
        }
        else if (req.query.name && req.query.command) {
            db.run(sql + ' AND locked = "false"',
                [decodeURIComponent(req.query.command), req.query.name],
                (e,r) => {res.json({status:"success"})}
            )
        }
        else { res.json({status:"error"}) }

    })

    app.get('/api/commands/add', (req,res) => {

        if(req.query.name && req.query.command) {
            if (~Object.keys(commands).indexOf(req.query.name)) {
                res.json({status:'dupe'})
            }
            else {
                db.run('INSERT INTO commands(name,command) VALUES (?,?)',
                    [req.query.name, req.query.command], 
                    (e,r) => {
                        if (e) res.json({status:e})
                        else res.json({status:"success"})
                    }
                )
            }
        }
        else { res.json({status:"error"}) }

    })

    // kick

    app.get('/api/kick', (req,res) => {
        req = url.parse(req.url, true);

        if(checkKey(req) && req.query.user) {

            let channel = req.query.channel || config.channel;

            res.json({});

            client.send('KICK', channel, req.query.user, '\u000304(╯°□°）╯︵ ┻━┻');
            
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

            client.send('MODE', channel, req.query.mode, req.query.user);
            
        }
        else {
            res.json({status:"error"});
        }
    })

    // log 


    app.get('/api/log', (req,res) => {

        if (req.query.text) {
            log.all('SELECT * from LOG WHERE message like ? ORDER BY id DESC', 
                [`%${req.query.text}%`],
                (e,r) => {
                    res.json(r);
                })
        }
        else if (req.query.id) {
            log.all('SELECT * from LOG WHERE id < ? ORDER BY id DESC LIMIT ?', 
                [req.query.id, req.query.limit],
                (e,r) => {
                    res.json(r);
                })
        }
        else {
            log.all('SELECT * from LOG ORDER BY id DESC LIMIT ?', 
                req.query.limit,
                (e,r) => {
                    res.json(r);
                })
        }
        
    })

    // stats

    app.get('/api/stats', (req,res) => {

        // default to last month

        var startdate = req.query.from;
        var enddate = req.query.to;

        if (!startdate || !enddate) return null;

        // SQLite seems to fuck with promises, so just wrap them in functions

        function freq(callback) {
            log.all('select user, count(*) from log where time > ? and time < ? group by user order by count(*) desc limit 30 ', 
                [startdate, enddate],
                callback
            );
        }

        function dump(callback) {
            log.all('select user, message from log where time > ? and time < ?',
                [startdate, enddate],
                callback
            );
        }

        function wordcount(data) {

            let counts = data.map(d => ({
                user: d.user,
                words: d.message.split(" ").length
            }));

            let users = {};

            counts.forEach(d => {

                if(users[d.user]) {
                    users[d.user].push(d.words)
                }
                else {
                    users[d.user] = [d.words];
                }

            })

            let averages = Object.keys(users).map(d => {
                let cnt = users[d].reduce((a,b) => a+b ) / users[d].length
                return {user: d, count: cnt|0};
            }).sort((a,b) => a.count - b.count).splice(-30)

            return averages;

        }

        d3q.queue()
            .defer(freq)
            .defer(dump)
            .await((error, linecount, dump) => {

                if(error) return 1;

                res.json({
                    linecount,
                    wordcount: wordcount(dump)
                });

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
                client.say(d, req.query.message);
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
                client.notice(d, req.query.message);
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


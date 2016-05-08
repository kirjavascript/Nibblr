// https://node-irc.readthedocs.org/en/latest/API.html

// live programmable HTTP API
// IRC bot framework

// TODO //

// sarah blake

// add command -> add and scroll to

// track active users
// logging, stats
// log to different db dev/live based on password being null and .gitignore the live one / seen (shreddy was last seen saying x) / log / stats / quotes /~speak
// fulltext indexing on log

// convert modules to data.db

// rss("item", "description", 3)

// add command wizard
// admin ui uplaod to imgur

// 19:23 <&Nibblr> Kirjava: add ~speak w/ https://www.npmjs.com/package/markovchain

// wolfram


process.env.TZ = 'Europe/London';

try { 
    var config = require('./config.json');
}
catch (e) { 
    console.log('config.json missing, see config.json.example');
    process.exit();
}   

// requires //

require('sugar-date');
var fs = require('fs');
var irc = require('irc');
var atob = require('atob');
var urban = require('urban');
var google = require('google');
var request = require('request');
var tortuga = require('tortuga');
var cheerio = require('cheerio');
var weather = require('weather-js');
var safeEval = require('safe-eval');
var html2txt = require('html-to-text');
var youtube = require('youtube-search');
var loopProtect = require('./lib/loop-protect');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

var webInterface = require('./web/server.js');

// initconf //

var hide = {hide:1};
var youtube_api = 'AIzaSyDWEWTDKnOqbEOij1ZENrGLpv4FIhtQ2eI';
google.resultsPerPage = 3;
irc.Client.prototype._updateMaxLineLength = function() {this.maxLineLength = 400};

// db //

var sqlite3 = require("sqlite3");
var db = new sqlite3.Database('data.db');

// sandbox //

var context = {
    loopProtect: loopProtect,
    html2txt: (str, lines) => {
        if (lines) return html2txt.fromString(str).split("\n").splice(0,lines).join("\n");
        else return html2txt.fromString(str);
    },
    br2n: str => str.replace(/<br ?\/?>/g, "\n"),
    striptags: str => str.replace(/<(?:.|\n)*?>/gm, ''),
    data: {},
    colour: (a,b) => b.split('\n').map(d => irc.colors.wrap(a,d)).join("\n"),
    randomcolour: function(str) {
        var colours = ['light_red', 'magenta', 'orange', 'yellow', 'light_green', 'cyan', 'light_cyan', 'light_blue', 'light_magenta', 'light_gray'];
        return irc.colors.wrap(colours[(Math.random()*colours.length)|0], str);
    },
    wget: function(url, funk) {

        if (typeof funk == "function") {

            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    try {
                        client.say(config.channel, entities.decode(funk(cheerio.load(body), body)));
                    }
                    catch (e) {client.say(config.channel, irc.colors.wrap('light_red', e))}

                }
                else {client.say(config.channel, irc.colors.wrap('light_red', error))}
            })
        }

        return hide;
    },
};

[ // make some props immutable
    'loopProtect', 'wget', 'br2n', 'striptags', 'colour', 'randomcolour', 'html2txt'
].forEach(d => Object.defineProperty(context, d, {
    configurable: false,
    writable:false
}))

// init //

function init() {
    if(config.webInterface.enabled) {
        var options = {client, db}
        webInterface(options);
    }
    schedule();
}

// schedule loop //

function schedule() {
    setInterval(() => {

        db.all('SELECT i,timestamp,user,message from events WHERE type = "remind"', (e,r) => {

            r.forEach(d => {

                if(Date.create(d.timestamp).isBefore('now')) {
                    db.run('DELETE FROM events WHERE i = ?', d.i);
                    client.say(config.channel, d.user+ ": " + irc.colors.wrap('light_magenta', d.message));
                }

            })

        });

    }, 5000)
}

// memo //

function checkMemo(user) {
    db.all('SELECT i,timestamp,user,target,message from events WHERE type = "memo" AND UPPER(target) = UPPER(?)', user, (e,r) => {

        r.forEach(d => {

            if(Date.create(d.timestamp).isBefore('now')) {
                db.run('DELETE FROM events WHERE i = ?', d.i);
                var who = d.target == d.user ? "you" : d.user;
                client.say(config.channel, d.target+ ", " + who + " said " + d.message);
            }

        })

    });
}

// client //

var client = new irc.Client(config.server, config.username, {
    channels: [config.channel],
    userName: 'eternium',
    realName: 'none',
    floodProtection: true,
    floodProtectionDelay: 250,
    autoRejoin: true
});

client.addListener("registered", function(message) {
    console.log(message);
    client.say("nickserv", "identify " + config.password);
    init();
});

client.addListener("message", function(from, to, text, message) {

    if(from=="VapeBot") return;

    checkMemo(from);

    var getUrl = text.match(/(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig);

    if (~text.toLowerCase().indexOf(atob('bmlnZ2Vy')) && from == "Shreddy") {
        client.say(to, irc.colors.wrap('light_magenta', "go fuck yourself"))
    }
    else if (text.indexOf('~define ') == 0) {

        try {
            var words = text.substring(8);

            urban(words).first(function(json) {
                json && client.say(to, json.definition);
            });
        }
        catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

    }


    else if (text.indexOf('~example ') == 0) {

        try {
            var words = text.substring(9);

            urban(words).first(function(json) {
                json && client.say(to, json.example);
            });
        }
        catch (e) {client.say(to, irc.colors.wrap('red', e))}

    }

    else if (text.indexOf('~imgur ') == 0) {

        var query = text.substring(7);

        if(query.length) {
            request({
                url: 'https://api.imgur.com/3/gallery/search/top/0/?q=' + query,
                headers: {'Authorization': 'Client-ID 40c7a9fdded8139'}
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    try {

                        var image = JSON.parse(body).data[0];

                        client.say(to, irc.colors.wrap('light_green', image.title + ': ') + image.link);

                    }
                    catch (e) {client.say(to, irc.colors.wrap('light_red', e))}
                }
            })
        }

    }

    else if (text.indexOf('~pornhub ') == 0) {

        var query = text.substring(9);

        if(query.length) {

                try {

                    request("http://www.pornhub.com/webmasters/search?search=" + query, function (error, response, body) {
                        if (!error && response.statusCode == 200) {

                            var json = JSON.parse(body);

                            if (json.videos && json.videos.length) {
                                var video = json.videos;

                                video = video[(Math.random()*video.length)|0];

                                var resp = irc.colors.wrap('yellow', video.title) + ' ' + irc.colors.wrap('orange', video.url) + '\n';

                                var tags = video.tags.map(d => d.tag_name).join(" ");

                                resp += irc.colors.wrap('light_magenta', tags)

                                client.say(to, resp)
                            }

                        }
                    })

                }
                catch (e) {client.say(to, irc.colors.wrap('light_red', e))}
        }

    }

    else if (text.indexOf('~drug ') == 0) {

        var query = text.substring(6);

        if(query.length) {

                try {

                    request("http://tripbot.tripsit.me/api/tripsit/getDrug?name=" + query, function (error, response, body) {
                        if (!error && response.statusCode == 200) {

                            var json = JSON.parse(body);

                            if (json.err == null && json.data) {

                                var data = json.data[0];

                                var resp = irc.colors.wrap('light_magenta', data.pretty_name);

                                data.aliases && " (" + data.aliases.join(", ") + ")";

                                resp += "\n";

                                data.properties.dose && (resp += data.properties.dose + "\n");

                                if (data.properties.onset && data.properties.duration && data.properties["after-effects"]) {
                                    resp += "onset: " + data.properties.onset +
                                        " duration: " + data.properties.duration +
                                        " after effects: " + data.properties["after-effects"] + "\n";
                                }

                                data.properties.summary && (resp += data.properties.summary + "\n");

                                data.properties.categories && (resp += "categories: " + data.properties.categories.join(" ") + "\n");

                                data.dose_note && (resp += data.dose_note + "\n");

                                client.say(to, resp)
                            }

                        }
                    })

                }
                catch (e) {client.say(to, irc.colors.wrap('light_red', e))}
        }

    }

    else if (text.indexOf('~youtube ') == 0) {

        var query = text.substring(7);

        if(query.length) {

            try {

                var opts = {
                    maxResults: 3,
                    key: youtube_api
                };

                youtube(query, opts, function(err, results) {
                    if(err) return client.say(to, irc.colors.wrap('light_red', err));

                    results.forEach(d => {
                        client.say(to, irc.colors.wrap('light_cyan', d.link) + ' ' + irc.colors.wrap('light_green', d.title))
                    })
                });

            }
            catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

        }

    }

    else if (text.indexOf('~google ') == 0) {

        var query = text.substring(7);

        if(query.length) {

            try {

                var opts = {
                    maxResults: 3,
                    key: youtube_api
                };

                google(query, function (err, res){
                    if(err) return client.say(to, irc.colors.wrap('light_red', err));

                    res.links.forEach(d => {
                        client.say(to, irc.colors.wrap('light_cyan', d.link) + ' ' + irc.colors.wrap('yellow', d.title))
                    })
                })

            }
            catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

        }

    }

    else if (text.indexOf('~weather ') == 0) {

        var query = text.substring(9);

        if(query.length) {

            try {

                weather.find({search: query, degreeType: 'C'}, function(err, result) {
                    if(err) return client.say(to, irc.colors.wrap('light_red', err));

                    if(result.length) {
                        result = result[0];

                        var response = irc.colors.wrap('light_green', result.location.name + ' ' + result.current.temperature + ' degrees, ' + result.current.skytext + ' wind ' + result.current.winddisplay + '\n');

                        result.forecast.forEach(d => response += irc.colors.wrap('light_green', d.date + ' ' + d.day + ' ') + d.skytextday + irc.colors.wrap('yellow', ' high: ' + d.high + ' low: ' + d.low) + '\n')

                        client.say(to, response);
                    }


                });


            }
            catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

        }

    }

    else if (text.indexOf('~reddit ') == 0) {

        function writePost(post) {
            var subreddit = "r/" + /\/r\/(.*?)\//g.exec(post.permalink)[1] + ' - ';

            if (post.is_self) {
                var resp = irc.colors.wrap('yellow', subreddit + post.title + "\n") + post.selftext;
            }

            else {
                var resp = irc.colors.wrap('yellow', subreddit + post.title + "; ") + irc.colors.wrap('light_cyan', post.url);
            }

            client.say(to, entities.decode(resp));
        }

        var query = text.substring(8);

        if(query.length) {

            try {

                request("https://www.reddit.com/r/"+query+"/random/.json", function (error, response, body) {
                    if (!error && response.statusCode == 200) {

                        var json = JSON.parse(body);

                        if (!json.error) {

                            if (!json[0]) {
                                var post = json.data.children;

                                if(post.length != 0) {
                                    post = post[(Math.random()*post.length)|0].data;

                                    writePost(post);
                                }


                            }
                            else { // array

                                if(json[0].data.children.length != 0) {
                                    var post = json[0].data.children[0].data;

                                    writePost(post);
                                }
                            }
                        }

                    }
                })

            }
            catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

        }

    }


    else if (text.indexOf('~torrent ') == 0) {

        try {

            var query = text.substring(9);

            if(query.length) {

                tortuga.search(query, function(results) {
                    if(results.length) {

                        var torrent = results[0];

                        var resp = torrent.title + irc.colors.wrap('light_green', ' ('+torrent.seeders+')') + irc.colors.wrap('yellow', ' ('+torrent.leechers+')') + '\n';
                        resp += irc.colors.wrap('light_cyan', torrent.magnet);

                        client.say(from, resp);
                    }
                })

            }

        }
        catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

    }

    else if (text.indexOf('~remind') == 0) {

        var rgxp = /~remind\((.*?)\) (.*)/.exec(text);

        if (rgxp && rgxp[1] && rgxp[2]) {
            var when = Date.create(rgxp[1]);
            var msg = rgxp[2];

            if (when.isBefore('now')) {
                client.say(to, irc.colors.wrap('light_red', 'Epoch fail'));
            }
            else if (when == "Invalid Date") {
                client.say(to, irc.colors.wrap('light_red', 'Error: Invalid Date'));
            }
            else {
                var resp = "Reminder set for ";

                resp += when.full();

                db.run("INSERT INTO events(timestamp,type,user,message) VALUES (?,?,?,?)", [
                    when.toISOString(),
                    'remind',
                    from,
                    msg
                ]);

                client.say(to, irc.colors.wrap('cyan', resp));
            }
        }

    }

    else if (text.indexOf('~memo') == 0) {

        var rgxp = /~memo\((.*?)\) (.*)/.exec(text);

        if (rgxp && rgxp[1] && rgxp[2]) {
            var user = rgxp[1];
            var msg = rgxp[2];
            var when = 'now';

            if(~user.indexOf(',')) {
                var when = user.split(',')[1];
                user = user.split(',')[0];
            }

            when = Date.create(when);

            if (when == "Invalid Date") {
                client.say(to, irc.colors.wrap('light_red', 'Error: Invalid Date'));
            }
            else if(user.length) {
                var resp = "Saved message for ";

                resp += user;

                if(when.isAfter('now')) {
                    resp += " delayed until " + when.full()
                }

                db.run("INSERT INTO events(timestamp,type,user,target,message) VALUES (?,?,?,?,?)", [
                    when.toISOString(),
                    'memo',
                    from,
                    user,
                    msg
                ]);

                client.say(to, irc.colors.wrap('cyan', resp));
            }

        }

    }



    else if (text == '~reset') {process.exit();}

    else if (text.indexOf('~eval ') == 0) {

        try {
            var resp = safeEval(text.substring(6), context);

            if (resp!==hide) 
                client.say(to, 
                    typeof resp == "string" ? context.colour("yellow", resp) :
                    typeof resp == "function" ? irc.colors.wrap('light_magenta', resp) :
                    irc.colors.wrap('light_red', resp)
                );
        }
        catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

    }

    else if (text.indexOf('~commands.list') == 0) {

        db.all('SELECT name from commands', (e,r) => {

            try {

                var response = "~eval ~commands.[name] ~remind(when) ~memo(user [,when]) ~reset ~define ~example ~imgur ~reddit ~google ~torrent ~youtube ~pornhub ~drug ~weather ~" + r.map(d => d.name).join(" ~");

                client.say(to, response);
            }
            catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

        })

    }

    else if (text.indexOf('~commands.') == 0) {

        var name = text.substring(10, text.indexOf(' '));

        var command = text.substring(text.indexOf(' ')+1);

        if(~text.indexOf(' ')) {

            db.get('select locked from commands where name = ?', name, (e,r) => {

                if(r && r.locked == "true") {
                    client.say(to, irc.colors.wrap('light_red', '~' + name + ' is locked'))
                }
                else {
                    if (r) { // exists
                        db.run("UPDATE commands SET command = ? WHERE name = ?", [command, name]);
                    }
                    else {
                        db.run("INSERT INTO commands(name,command) VALUES (?,?)", [name, command]);
                    }

                    try {
                        var response = typeof safeEval(command, context) + ' ~' + name + ' added';

                        client.say(to, irc.colors.wrap('light_magenta', response));
                    }
                    catch (e) {client.say(to, irc.colors.wrap('light_red', e))}
                }

            });
        }
        else {
            name = text.substring(10);
            db.get('select command from commands where name = ?', name, (e,r) => {
                if(r) {
                    client.say(to, r.command);
                }
            });

        }

    }
    

    else if (text[0] == '~') {

        if(text.indexOf(' ') == -1) {
            var name = text.substring(1);
            var params = [];
        }
        else {
            var name = text.substring(1, text.indexOf(' '));
            var params = text.split(" ");
            params.shift();
        }

        var input = text.substring(text.indexOf(' ')+1);

        db.get('select command from commands where name = ?', name, (e,r) => {
            if(r) {
                try {

                    var loopNuke = loopProtect(r.command);

                    var response, command = safeEval(loopNuke, context)

                    if(typeof command == "function"){
                        response = command.call(context, input, params, {from, to, text, message});
                    }
                    else {
                        response = command;
                    }

                    if(response!=hide) client.say(to, response);

                }
                catch (e) {client.say(to, irc.colors.wrap('light_red', e))}
            }
        })

    }
    else if (getUrl && getUrl[0]) {

        request(getUrl[0], function (error, response, body) {
            if (!error && response.statusCode == 200) {

                try {

                    var title = /<title>(.+)<\/title>/ig.exec(body);

                    if(title && title[1]) {

                        var data = "Title: " + entities.decode(title[1]);

                        client.say(to, irc.colors.wrap('light_cyan', data));

                    }


                }
                catch (e) {client.say(to, e)}
            }
        })


    }

});

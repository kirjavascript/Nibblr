require('sugar-date');
var irc = require('irc');
var urban = require('urban');
var c = require('irc-colors');
var google = require('google');
var markov = require('markov');
var request = require('request');
var weather = require('weather-js');
var safeEval = require('safe-eval');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();
var log = require('../index').log;
var db = require('../index').db;
var config = require('../index').config;

var google_api = 'AIzaSyDWEWTDKnOqbEOij1ZENrGLpv4FIhtQ2eI';
google.resultsPerPage = 3;

var client, from, to, text, message, hide, context, process;

function setContext(arr) {
    [client, from, to, text, message, hide, context] = arr;
    triv.attempt(from, text);
}

function exists(text) {
    var command = text.match(/~([a-zA-Z]*)/);
    var params = null;

    if (command) {
        command = command[1];
        params = text.slice(text.indexOf(command)+command.length+1);
    }

    if (command && text[0] == '~' && ~Object.keys(commands).indexOf(command)) {
        return {params, text, command};
    }
    else {
        return undefined;
    }
}

var triv = {
    timer: null,
    question: {},
    cleanAnswer: null,
    points: {},
    toggle() {
        if (triv.timer == null) {
            triv.start();
        }
        else {
            triv.stop();
        }
    },
    start() {
        client.say(config.channel, irc.colors.wrap('light_green', 'Trivia started! Invoke ~trivia to stop, ~clue for clues, and ~skip to skip the question'));
        triv.newQuestion();
    },
    stop() {
        client.say(config.channel, irc.colors.wrap('light_red', 'rip trivia'));

        triv.getLocalPoints();
        triv.points = {};
        // local scores, global scores
        clearInterval(triv.timer);
        triv.timer = null;
    },
    newQuestion() {
        clearInterval(triv.timer);
        triv.timer = null;
        request('http://jservice.io/api/random', function (error, response, body) {
            if (!error && response.statusCode == 200) {

                triv.question = JSON.parse(body);

                triv.cleanAnswer = triv.question[0].answer
                    .replace(/<(?:.|\n)*?>/gm, '')
                    .replace(/[^a-z0-9]/gi,'')
                    .replace(/^a/gi,'')
                    .replace(/^the/gi,'')
                    .replace(/s$/gi,'')
                    .toLowerCase();

                console.log(triv.cleanAnswer)

                var q = 
                irc.colors.wrap('magenta', 'Question: ') +
                triv.question[0].question + 
                irc.colors.wrap('yellow', ' ('+triv.question[0].category.title+')');

                client.say(config.channel, q);

                client.say(config.channel, irc.colors.wrap('light_green', '1 minute'));

                var seconds = 60;

                triv.timer = setInterval(d => {

                    seconds -= 10;

                    if (seconds == 30) {
                        client.say(config.channel, irc.colors.wrap('light_green', '30 Seconds'));
                    }
                    else if (seconds == 20) {
                        client.say(config.channel, irc.colors.wrap('yellow', '20 Seconds'));
                    }
                    else if (seconds == 10) {
                        client.say(config.channel, irc.colors.wrap('light_red', '10 Seconds'));
                    }
                    else if (!seconds) {
                        client.say(config.channel, irc.colors.wrap('light_blue', 'Time\'s up! The answer was: ') + triv.question[0].answer);
                        triv.newQuestion();
                    }

                }, 10000)
            }
        })
    },
    skip() {
        if (triv.timer != null) {
            client.say(config.channel, irc.colors.wrap('light_magenta', 'Question skipped :( The answer was: ') + triv.question[0].answer);
            triv.newQuestion();
        }
    },
    clue() {
        if (triv.timer != null) {
            request('http://jservice.io/api/clue', function (error, response, body) {
                if (!error && response.statusCode == 200) {

                }
            });
        }
    },
    attempt(from, text) {
        if (triv.timer != null) {
            var cleanAnswer = text
                .replace(/[^a-z0-9]/gi,'')
                .replace(/^a/gi,'')
                .replace(/^the/gi,'')
                .replace(/s$/gi,'')
                .toLowerCase();

            if (triv.question.length && cleanAnswer == triv.cleanAnswer) {
            //if (1) {

                var points = 10;

                if (triv.points[from]) {
                    triv.points[from] += points;
                }
                else {
                    triv.points[from] = points;
                }

                triv.addPointsDB(from, points);

                client.say(config.channel, irc.colors.wrap('light_green', 'Correct! The answer was: ') + triv.question[0].answer);
                client.say(config.channel, irc.colors.wrap('light_green', from + ' gets ' + points + ' points for a total of ' + triv.points[from]));
                triv.newQuestion();

            }
        }
    },
    addPointsDB(from, points) {
        db.get('select points from triviapoints where username = ?',
            from,
            (e,r) => {
                if (r == undefined) {
                    db.run("INSERT INTO triviapoints(username,points) VALUES (?,?)", [from, points]);
                }
                else {
                    db.run("UPDATE triviapoints SET points = ? WHERE username = ?", [points + r.points, from]);
                }
            })
    },
    getLocalPoints() {
        Object.keys(triv.points).length &&
        client.say(config.channel, irc.colors.wrap('orange', 'points this game: ') + 
            Object.keys(triv.points)
                .map(d => `${d}: ${triv.points[d]}`)
                .join(' '));
    },
    stats() {
        if (triv.timer != null) triv.getLocalPoints();

        db.all('select username,points from triviapoints',
            (e,r) => {
                client.say(config.channel, irc.colors.wrap('orange', 'global points: ') + 
                    r.map(d => `${d.username}: ${d.points}`).join(' '));
            })
    }
};

var commands = {
    // trivia //
    trivia(words, text) {
        triv.toggle();
    },
    clue(words, text) {
        triv.clue();
    },
    skip(words, text) {
        triv.skip();
    },
    triviastats() {
        triv.stats();
    },
    // /trivia //
    speak(query, text) {
        log.all('SELECT message FROM log ORDER BY RANDOM() LIMIT 1000',(e,r) => {

            var words = r.map(d => d.message).join(' ');
            var seed = query || words.split(' ').pop();
            var m = markov(1);

            m.seed(words, () => {
                client.say(to, m.respond(seed).join(' '))
            })
        })
    },
    define(words, text) {
        urban(words).first(function(json) {
            json && client.say(to, json.definition);
        });
    },
    example(words, text) {
        urban(words).first(function(json) {
            json && client.say(to, json.example);
        });
    },
    imgur(query, text) {
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
    },
    pornhub(query, text) {

        if(query.length) {
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

    },
    drug(query, text) {
        if(query.length) {
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

    },

    youtube(query, text) {

        query = query+' site:youtube.com';

        if(query.length) {
            var opts = {
                maxResults: 4,
                key: google_api
            };

            google(query, function (err, res){
                if(err) return client.say(to, irc.colors.wrap('light_red', err));

                res.links.filter(d => d.link).forEach(d => {
                    client.say(to, irc.colors.wrap('light_blue','▶ ') + irc.colors.wrap('light_cyan', d.link) + ' ' + irc.colors.wrap('light_green', d.title))
                })
            })
        }

    },
    google(query, text) {

        if(query.length) {

            var opts = {
                maxResults: 4,
                key: google_api
            };

            google(query, function (err, res){
                if(err) return client.say(to, irc.colors.wrap('light_red', err));

                res.links.filter(d => d.link).forEach(d => {
                    client.say(to, irc.colors.wrap('light_blue','▶ ') + irc.colors.wrap('light_cyan', d.link) + ' ' + irc.colors.wrap('yellow', d.title))
                })
            })

        }

    },
    weather(query, text) {

        if(query.length) {

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

    },
    reddit(query, text) {

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

        if(query.length) {

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

    },
    "log": function(query, text) {

        var rgxp = /~log\((.*?)\) (.*)/.exec(text);
        var rgxp2 = /~log (.*)/.exec(text);

        if (rgxp && rgxp[1] && rgxp[2]) {
            var lines = rgxp[1];
            var srch = rgxp[2];

            log.all('SELECT time,user,message from LOG WHERE message like ? ORDER BY id DESC LIMIT ?',
                [`%${srch}%`, lines],
                (e,r) => {
                    r && r.forEach(d => {
                        var resp = c.underline(d.time) + ' <'+d.user+'> '+d.message;
                        client.say(to, resp);
                    })
                })
        }
        else if (rgxp2 && rgxp2[1]) {
            log.get('SELECT time,user,message from LOG WHERE message like ? ORDER BY id DESC',
                `%${rgxp2[1]}%`,
                (e,r) => {
                    if(r && r.time) {
                        var resp = c.underline(r.time) + ' <'+r.user+'> '+r.message;
                        client.say(to, resp);
                    }
                })
        }
        else {
            client.say(to, irc.colors.wrap('light_red', 'Syntax: ~log search term OR ~log(qty) search term'));
        }

    },
    remind(query, text) {

        var rgxp = /~remind\((.*?)\) (.*)/.exec(text);

        if (rgxp && rgxp[1] && rgxp[2]) {
            var when = Date.create(rgxp[1]);
            var _msg = rgxp[2];

            if (when.isBefore('now')) {
                client.say(to, irc.colors.wrap('light_red', 'Epoch fail'));
            }
            else if (when == "Invalid Date") {
                client.say(to, irc.colors.wrap('light_red', 'Error: Invalid Date'));
            }
            else {
                var resp = "▶ Reminder set for ";

                resp += when.full();

                db.run("INSERT INTO events(timestamp,type,user,message) VALUES (?,?,?,?)", [
                    when.toISOString(),
                    'remind',
                    from,
                    _msg
                ]);

                client.say(to, irc.colors.wrap('cyan', resp));
            }
        }
        else {
            client.say(to, irc.colors.wrap('light_red', 'Syntax: ~remind(when) message'));
        }

    },
    memo(query, text) {

        var rgxp = /~memo\((.*?)\) (.*)/.exec(text);

        if (rgxp && rgxp[1] && rgxp[2]) {
            var user = rgxp[1];
            var _msg = rgxp[2];
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
                var resp = "▶ Saved message for ";

                resp += user;

                if(when.isAfter('now')) {
                    resp += " delayed until " + when.full()
                }

                db.run("INSERT INTO events(timestamp,type,user,target,message) VALUES (?,?,?,?,?)", [
                    when.toISOString(),
                    'memo',
                    from,
                    user,
                    _msg
                ]);

                client.say(to, irc.colors.wrap('cyan', resp));
            }

        }
        else {
            client.say(to, irc.colors.wrap('light_red', 'Syntax: ~memo(who [, when]) message'));
        }

    },
    seen(who, text) {

        console.log(who)

        log.get('SELECT time,command,message FROM log where lower(user) = lower(?) ORDER BY time DESC',
            who,
            (e,r) => {
                if(r) {
                    let _msg = `${who} was last seen ${r.time} using ${r.command} ${r.message}`;

                    client.say(to, irc.colors.wrap('cyan', _msg));
                }
                else {
                    client.say(to, irc.colors.wrap('cyan', '¯\\_(ツ)_/¯'));
                }
            })

    },

    "commands": function (query, text) {

        if (text.indexOf('~commands.list') == 0 ) {

            db.get('SELECT count(name) from commands', (e,r) => {

                try {

                    var wi = config.webInterface;

                    var response = `There are currently ${r['count(name)'] + Object.keys(commands).length} commands. a full list is available here: http://${wi.domain}:${wi.port}/commands`;

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
                            var response = typeof safeEval(command, context.sandbox) + ' ~' + name + ' added';

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

    },


    "eval": function(query, text) {

        try {
            var resp = safeEval(query, context.sandbox);

            if (resp!==hide)
                client.say(to,
                    typeof resp == "string" ? context.sandbox.colour("yellow", resp) :
                    typeof resp == "function" ? irc.colors.wrap('light_magenta', resp) :
                    irc.colors.wrap('light_red', resp)
                );
        }
        catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

    },
    nick(query) {
        client.send('NICK', query);
    },
    "reset": function() {/* nope */},
    combobreaker() {/* nope */},
}

module.exports = {
    exists,
    commands,
    setContext
}
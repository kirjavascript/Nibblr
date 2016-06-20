var irc = require('irc');
var request = require('request');
var config = require('../index').config;
var db = require('../index').db;
var client;

var triv = {
    init(_client) { client = _client },
    timer: null,
    question: {},
    cleanAnswer: null,
    points: {},
    clueCount: 0,
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
        clearInterval(triv.timer);
        triv.timer = null;
    },
    newQuestion() {
        clearInterval(triv.timer);
        triv.timer = null;
        triv.clueCount = 0;
        request('http://jservice.io/api/random', function (error, response, body) {
            if (!error && response.statusCode == 200) {

                triv.question = JSON.parse(body);

                triv.cleanAnswer = triv.question[0].answer
                    .replace(/<(?:.|\n)*?>/gm, '')
                    .replace(/[^a-z0-9]/gi,'')
                    .replace(/^a/gi,'')
                    .replace(/^an/gi,'')
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
            triv.clueCount++;
            var answer = triv.question[0].answer.replace(/<(?:.|\n)*?>/gm, '');

            var parsed = answer.split(' ').map(d => {
                var strLen = (d.length-triv.clueCount)+1;
                return d.slice(0,triv.clueCount) + 
                new Array(strLen > -1?strLen:0).join('_')
            }).join(' ');

            client.say(config.channel, parsed);
        }
    },
    attempt(from, text) {
        if (triv.timer != null) {
            var cleanAnswer = text
                .replace(/[^a-z0-9]/gi,'')
                .replace(/^a/gi,'')
                .replace(/^the/gi,'')
                .replace(/^an/gi,'')
                .replace(/s$/gi,'')
                .toLowerCase();

            if (triv.question.length && cleanAnswer == triv.cleanAnswer) {
            //if (1) {

                var points = 10 - (triv.clueCount*2);

                points = points < 0 ? 0 : points;

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

module.exports = triv;
var irc = require('irc');
var config = require('../index').config;
var db = require('../index').db;
var c = require('irc-colors');
var client;

var jackpot = 100;
var megapot = 1000;

db.get('select slots from points where username = "$jackpot"',
    (e,r) => {
        if (r != undefined) {
            jackpot = r.slots;
        }
        else {
            db.run('INSERT INTO points(username,slots) VALUES (?,?)',
                ['$jackpot', 100]
            );
        }
    });

db.get('select slots from points where username = "$megapot"',
    (e,r) => {
        if (r != undefined) {
            megapot = r.slots;
        }
        else {
            db.run('INSERT INTO points(username,slots) VALUES (?,?)',
                ['$megapot', 1000]
            );
        }
    });

if (megapot < 1000) megapot = 1000;

var timers = {};
var delay = 1500;

var sym = ['1,8 BELL ','1,4 CHERRY ','1,6 PLUM ','1,9 WEED ','0,4 STRAWBERRY ','0,1 COAL ','1,11 BLUEBERRY ','1,7 ORANGE ','4,3 APPLE ','0,7 WOOD ','15,8 LEMON ','1,16 BANANA ','0,6 PURPLE ','5,3 WATERMELON ', c.red.bgwhite(' SKITTLES ')];

function get() {
    return sym[(Math.random()*15)|0];
}

var slots = {
    init(_client) { client = _client },
    go(user) {

        if (timers[user]) {
            client.notice(user, 'please wait');
            return;
        }

        var msg = `[7SLOT-MACHINE] Current Jackpot: €${jackpot}  :::  Rolling the wheels.\n`;
        var rslt = [get(),get(),get()];

        msg += `${rslt.join('')}\n`;

        if (rslt[0]==rslt[1]&&rslt[0]==rslt[2]) {
            addPoints(user, jackpot);
            msg += `0 1,8 J 1,4 A 1,9 C 1,7 K 1,13 P 1,11 O 1,5 T    !!! ${user} just won €${jackpot} !\n`
            jackpot = 100;
            db.run('UPDATE points SET slots = ? WHERE username = ?',
                [+jackpot, '$jackpot']
            );
        }
        else if (rslt[0]==rslt[1]||rslt[1]==rslt[2]) {
            var win = (Math.random()*4)|0;
            msg += `!!! ${user} just won €${win+1} !\n`
            addPoints(user, win);
        }
        else {
            addPoints(user, -1);
            jackpot += 2;
            db.run('UPDATE points SET slots = ? WHERE username = ?',
                [+jackpot, '$jackpot']
            );
        }

        client.say(config.channel, msg);

        timers[user] = setTimeout(() => {
            timers[user] = void 0;
        }, delay);
    },
    mega(user) {

        if (timers[user]) {
            client.notice(user, 'please wait');
            return;
        }

        db.get('select slots from points where username = ?',[user],
            (e,r) => {
                if (r == undefined || r.slots < 1000) {
                    client.say(config.channel, 'You need at least €1000 to play megaslots');
                }
                else {

                    var msg = `[7MEGA-SLOT-MACHINE] Current Megapot: €${megapot}  :::  Rolling the wheels.\n`;
                    var rslt = [get(),get(),get(),get()];

                    msg += `${rslt.join('')}\n`;

                    if (rslt[0]==rslt[1]&&rslt[0]==rslt[2]&&rslt[0]==rslt[3]) {
                        addPoints(user, megapot);
                        msg += `0 1,8 J 1,4 A 1,9 C 1,7 K 1,13 P 1,11 O 1,5 T    !!! ${user} just won €${megapot} !\n`
                        megapot = 1000;
                        db.run('UPDATE points SET slots = ? WHERE username = ?',
                            [+jackpot, '$megapot']
                        );
                    }
                    else if ((rslt[0]==rslt[1]&&rslt[0]==rslt[2])||(rslt[3]==rslt[1]&&rslt[3]==rslt[2])) {
                        var win = 1000;
                        msg += `!!! ${user} just won €${win} !\n`
                        addPoints(user, win);
                    }
                    else if (rslt[0]==rslt[1]||rslt[1]==rslt[2]||rslt[2]==rslt[3]) {
                        var win = (Math.random()*8)|0;
                        win++;
                        win *= 10;
                        msg += `!!! ${user} just won €${win} !\n`
                        addPoints(user, win);
                    }
                    else {
                        addPoints(user, -10);
                        megapot += 20;
                        db.run('UPDATE points SET slots = ? WHERE username = ?',
                            [+megapot, '$megapot']
                        );
                    }

                    client.say(config.channel, msg);

                    timers[user] = setTimeout(() => {
                        timers[user] = void 0;
                    }, delay);

                }
            });
    },
    stats() {
        db.all('select username,slots from points',
            (e,r) => {
                var msg = r.filter(d => d['slots'])
                    .sort((a,b) => +b['slots'] - +a['slots'])
                    .filter(d => d.username.indexOf('$') != 0)
                    .map(d => `${d.username}: ${d['slots']}`)
                    .join(' ');

                client.say(config.channel, irc.colors.wrap('orange', 'slots points: ') + msg);
            })
    }
};

function addPoints(from, points) {
    db.get('select slots from points where username = ?',
        from,
        (e,r) => {
            if (r == undefined) {
                db.run('INSERT INTO points(username,slots) VALUES (?,?)', [from, 100 + points]);
                client.say(config.channel, `${from} has €${100 + points} `);
            }
            else {
                var pts = points + (+r['slots']);
                db.run('UPDATE points SET slots = ? WHERE username = ?', [pts, from]);
                client.say(config.channel, `${from} has €${pts} `);
            }

        });
}

module.exports = slots;

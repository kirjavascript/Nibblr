var irc = require('irc');
var config = require('../index').config;
var db = require('../index').db;
var client;

var jackpot = 100;

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

var timers = {};
var delay = 5000;

var slots = {
    init(_client) { client = _client },
    go(user) {

        if (timers[user]) {
            client.say(config.channel, 'please wait');
            return;
        }

        var sym = ['1,8 BELL ','1,4 CHERRY ','1,6 PLUM ','1,9 WEED ','0,4 STRAWBERRY ','0,1 COAL ','1,11 BLUEBERRY ','1,7 ORANGE ','4,3 APPLE '];


        var msg = `[7SLOT-MACHINE] Current Jackpot: €${jackpot}  :::  Rolling the wheels.\n`;

        function get() {
            return sym[(Math.random()*9)|0];
        }

        var rslt = [get(),get(),get()];

        msg += `${rslt.join('')}\n`;

        if (rslt[0]==rslt[1]&&rslt[0]==rslt[2]) {
            addPoints(user, jackpot);
            msg += `0 1,8 J 1,4 A 1,9 C 1,7 K 1,13 P 1,11 O 1,5 T    !!! ${user} just won €${jackpot} !\n`

            jackpot = 100;
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
    stats() {
        db.all('select username,slots from points',
            (e,r) => {
                var msg = r.filter(d => d['slots'])
                    .sort((a,b) => a['slots'] < b['slots'])
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
                var pts = r['slots']?points + r['slots']:points+100;
                db.run('UPDATE points SET slots = ? WHERE username = ?', [pts, from]);
                client.say(config.channel, `${from} has €${pts} `);
            }

        });
}

module.exports = slots;
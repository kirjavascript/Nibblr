var irc = require('irc');
var c = require('irc-colors');
var cheerio = require('cheerio');
var request = require('request');
var html2txt = require('html-to-text');
var loopProtect = require('../lib/loop-protect');
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

var client, from, to, text, message, hide;

function init(_client) {
    client = _client;
}

function getMessage(arr) {
    [from, to, text, message, hide] = arr;
}

var sandbox = {
    loopProtect: loopProtect,
    html2txt: (str, lines) => {
        if (lines) return html2txt.fromString(str).split("\n").splice(0,lines).join("\n");
        else return html2txt.fromString(str);
    },
    br2n: str => str.replace(/<br ?\/?>/g, "\n"),
    striptags: str => str.replace(/<(?:.|\n)*?>/gm, ''),
    data: {},
    c: c,
    colour: (a,b) => b.split('\n').map(d => irc.colors.wrap(a,d)).join("\n"),
    delay(msg, time) {
        setTimeout(function() {
            client.say(to, msg);
        }, time);
        return hide;
    },
    say(msg) {
        client.say(to, msg);
        return hide;
    },
    randomcolour(str) {
        var colours = ['light_red', 'magenta', 'orange', 'yellow', 'light_green', 'cyan', 'light_cyan', 'light_blue', 'light_magenta', 'light_gray'];
        return irc.colors.wrap(colours[(Math.random()*colours.length)|0], str);
    },
    wget(url, funk) {

        if (typeof funk == "function") {

            request(url, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    try {
                        client.say(to, entities.decode(funk(cheerio.load(body), body)));
                    }
                    catch (e) {client.say(to, irc.colors.wrap('light_red', e))}

                }
                else {client.say(to, irc.colors.wrap('light_red', error))}
            })
        }

        return hide;
    },
};

[ // make some props immutable
    'loopProtect', 'wget', 'br2n', 'striptags', 'colour', 'randomcolour', 'html2txt'
].forEach(d => Object.defineProperty(sandbox, d, {
    configurable: false,
    writable:false
}))

module.exports = {
    sandbox,
    getMessage,
    init
}
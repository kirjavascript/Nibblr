var c = require('irc-colors');
var config = require('../index').config;
var db = require('../index').db;
var client;

var deck = {
    cards: [],
    clean() {
        this.cards = [];
        [...'♥♦♠♣'].forEach((s,i) => {
            [..."23456789⒑JQKA"].forEach((n,j) => {
                this.cards.push({
                    number: j+2,
                    suit: s,
                    glyph: i < 2 ? c.red(n+s) : n+s
                });
            })
        })
    },
    shuffle() {
        for(let j, x, i = this.cards.length; i; j = Math.floor(Math.random() * i), x = this.cards[--i], this.cards[i] = this.cards[j], this.cards[j] = x);
    },
    new() {
        this.clean();
        this.shuffle();
    },
    draw(qty = 1) {
        if (!this.cards.length) return undefined;
        else if (qty == 1) return this.cards.shift();
        else return this.cards.splice(0,qty)
    }
};

function say(msg) {
    client.say(config.channel, msg);
}

function pm(user, msg) {
    client.say(user, msg);
}


// avoid use of timer
// 21:45 < cr0sis> 5/10 blinds 1000 stack?!
// round counter
// double every 5 rounds

var running = false;
var players, round, blinds;

var poker = {
    init(_client) { client = _client },
    toggle(stack) {

        if (running) {
            say('rip poker');
            running = false;
        }
        else {
            deck.new();
            players = {};
            round = 1;
            blinds = { small: 5, big: 10 };

            var [h, d, s, k] = [c.red('♥'),c.red('♦'),'♠','♣'];

            say(`${d}${s}${h}${k} ¡poker! ${k}${d}${s}${h}`);

            say(`Please type ${c.red('join')} to take part and ${c.green('start')} to begin`);

            running = 'join';
        }

    },
    message(from, text) {
        if (running == 'join' && text == 'join') {
            this.join(from);
        }
        else if (running == 'join' && text == 'start') {
            this.start();
        }

    },
    join(who) {
        if (!players[who]) {
            var card = deck.draw();
            players[who] = {};
            players[who].order = card.number;
            say(`${c.green(who)} joined and drew the ${card.glyph}`);
        }
    },
    start() {
        if (Object.keys(players).length < 2) {
            say(c.red('Not enough players!'));
            return undefined;
        }

        players = Object.keys(players).map(d => ({
            name: d,
            order: players[d].order,
            stack: 1000,
            bet: 0,
            fold: false,
            cards: [],
        })).sort((a,b) => a.order < b.order);

        running = 'round';
        
        say(c.green('Lets begin!'));
        this.round();
    },
    round() {
        deck.new();
        // reset players
        say(`Round ${round}: ${c.red(players[0].name)} is small blind, ${c.red(players[1].name)} is big blind`);
        this.deal();
        this.addBet(blinds.small);
        this.addBet(blinds.big);
        this.showStats();
        this.queryPlayer();

    },
    deal() {
        players.forEach(d => {
            d.cards = deck.draw(2);
            pm(d.name, 'Round 1 cards: ' + d.cards.map(d => d.glyph).join(' '))
            if (d.cards[0].number + d.cards[1].number == 28) {
                pm(d.name, c.yellow('pocket rockets!'));
            }
        })
    },
    addBet(qty) {
        var player = players.shift();
        player.stack -= qty;
        player.bet += qty;
        players.push(player);
    },
    queryPlayer() {
        // call/check bet fold
    },
    showStats() {
        var pot = players.reduce((a,b) => a.bet + b.bet);
        var bets = players.filter(d => d.bet).map(d => `${c.yellow(d.name)} ${c.green.bold('$'+d.bet)}`).join(' ');

        say(`Pot: ${c.green.bold('$'+pot)} Bets: ${bets}`);
    },
};

module.exports = poker;
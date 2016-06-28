let c = require('irc-colors');
let config = require('../index').config;
let db = require('../index').db;
let client;

let deck = {
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
// ASCII flop
// http://2013.jsconf.eu/speakers/martin-kleppe-1024-seconds-of-js-wizardry.html
// https://www.youtube.com/watch?v=YRo2GStE3Qg

let running = false;
let players, round, blinds;

let poker = {
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

            let [h, d, s, k] = [c.red('♥'),c.red('♦'),'♠','♣'];

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
        else if (running == 'query' && players[0].name == who) {
            this.command(from, text);
        }

    },
    join(who) {
        if (!players[who]) {
            let card = deck.draw();
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
            state: false,
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
        this.addBet(blinds.small, true);
        this.addBet(blinds.big, true);
        this.showStats();
        this.queryPlayer();

    },
    // ascii flop
    // river
    deal() {
        players.forEach(d => {
            d.cards = deck.draw(2);
            pm(d.name, 'Round 1 cards: ' + d.cards.map(d => d.glyph).join(' '))
            if (d.cards[0].number + d.cards[1].number == 28) {
                pm(d.name, c.yellow('pocket rockets!'));
            }
        })
    },
    addBet(qty, isBlind = false) {
        let player = players.shift();
        player.stack -= qty;
        player.bet += qty;
        if (isBlind == false) {
            player.state = 'bet';
        }
        players.push(player);
    },
    queryPlayer() {
        // if players = 1, if all bet & bets are equal or fold (mark out)

        running = 'query';

        let bet = players[0].bet;

        say(`${players[0].name}; ${c.yellow('check')}, ${c.green('raise')}, or ${c.red('fold')}`);

        

        if (!state && bet < this.highestBet()) {
            say(`${players[0].name}; ${c.yellow('call')}, ${c.green('raise')}, or ${c.red('fold')}`);
        }
        
        // call/check bet fold
    },
    // do condition check
    command(who, what) {

    },
    check (who, what) {},
    call (who, what) {},
    bet (who, what) {},
    raise (who, what) {},
    fold (who, what) {},
    allin (who, what) {},
    showStats() {
        let pot = this.pot();
        let bets = players.filter(d => d.bet).map(d => `${c.yellow(d.name)} ${c.green.bold('$'+d.bet)}`).join(' ');

        say(`Pot: ${c.green.bold('$'+pot)} Bets: ${bets}`);
    },
    pot() {
        return players.reduce((a,b) => a.bet + b.bet);
    },
    highestBet() {
        return Math.max(...players.map(d => d.bet));
    }
    // more
};

module.exports = poker;
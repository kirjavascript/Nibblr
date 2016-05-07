var url = require("url");
var http = require("http");

module.exports = function(client, db, config) {

    // http://kirjava.xyz:8888/?say=1&users=%238bitvape&message=test

    var server = http.createServer((req, res) => {
        req = url.parse(req.url, true);

        if(req.query.users && req.query.message) {
            res.end('sent ' + req.query.message + ' to ' + req.query.users);

            var action = req.query.say ? 'say' : 'notice';

            req.query.users.split(',').forEach(d => {
                client[action](d, req.query.message);
            })
        }

    });

    server.listen(config.serverport, () => console.log('notify server listening'))
}
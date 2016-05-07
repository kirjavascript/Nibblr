var io = require('socket.io');

var clients = [];

module.exports = function(obj) {

    var socket = io.listen(obj.server);

    socket.on('connection', client => connected(client, socket));

    obj.client.addListener("message", function(from, to, text, message) {
        clients.forEach(client => {
            client.emit('message', {from,to,text,message})
        })
    });

    setInterval(() => {
        clients = clients.filter(client => client.connected);

        clients.forEach(client => {
            client.emit('viewers', clients.length)
        })

    }, 5000)

}

function connected(client, socket) {
    clients.push(client);

    socket.on('disconnected', client => {

        clients.splice(i, clients.indexOf(client));

    });

}
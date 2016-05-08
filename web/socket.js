var io = require('socket.io');

var info = {
    topic: '',
    nicks: []
};

module.exports = function(obj) {

    var socket = io.listen(obj.server);

    socket.on('connection', client => {
        emit('viewers', clients().length)
        emit('topic', info.topic)
        emit('nicks', info.nicks)

        client.on('disconnect', client => {
            emit('viewers', clients().length)
        });

    });

    obj.client.addListener("message", function(from, to, text, message) {

        emit('message', {from,to,text,message})

    });

    obj.client.addListener("topic", function(channel, topic, nick, message) {

        info.topic = topic;
        emit('topic', info.topic);

    });

    obj.client.addListener("names", function(channel, nicks) {

        info.nicks = Object.keys(nicks).map(d => nicks[d]+d);
        emit('nicks', info.nicks);

    });

    function emit(str, obj) {
        clients().forEach(client => {
            client.emit(str, obj);
        })
    }

    function clients() {
        return Object
            .keys(socket.sockets.sockets)
            .map(d => socket.sockets.sockets[d])
            .filter(client => client.connected)
    }

}


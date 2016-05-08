var io = require('socket.io');

module.exports = function(obj) {

    var socket = io.listen(obj.server);

    socket.on('connection', client => {
        emit('viewers', _clients().length)

        client.on('disconnect', client => {
            emit('viewers', _clients().length)
        });

    });

    obj.client.addListener("message", function(from, to, text, message) {

        emit('message', {from,to,text,message})

    });

    function emit(str, obj) {
        _clients().forEach(client => {
            client.emit(str, obj);
        })
    }

    function _clients() {
        return Object
            .keys(socket.sockets.sockets)
            .map(d => socket.sockets.sockets[d])
            .filter(client => client.connected)
    }

}


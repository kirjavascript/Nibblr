var io = require('socket.io');

module.exports = function(obj) {

    var socket = io.listen(obj.server);

    socket.on('connection', client => 
        client.emit('init', {status:'connected'})
    );

}
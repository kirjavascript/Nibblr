var io = require('socket.io');

module.exports = function(obj) {

    io.listen(obj.server)


}
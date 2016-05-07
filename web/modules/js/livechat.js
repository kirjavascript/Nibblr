import * as d3 from './d3';
import io from 'socket.io-client';

var channel = d3.select('.channel');

if (!channel.empty()) {

    var socket = io.connect('http://127.0.0.1:1337');

    socket.on('connect', () => {

        debug("connect");

    });

    socket.on('disconnect', function(){ 

        debug("disco");

    });

    socket.on('ack', function(obj){ debug(JSON.stringify(obj))});
    socket.emit('syn', "test");

}
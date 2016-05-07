import * as d3 from './d3';
import io from 'socket.io-client';

var channel = d3.select('.channel');

if (!channel.empty()) {

    // add to config
    var socket = io.connect('http://127.0.0.1:8888');

    socket.on('connect', () => {


    });

    socket.on('disconnect', function(){ 


    });

    socket.on('init', o => {
        console.log(o)
    });

}
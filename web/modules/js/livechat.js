import * as d3 from './d3';
import io from 'socket.io-client';
import config from '../../../config.json';

var channel = d3.select('.channel');

if (!channel.empty()) {

    var socket = io.connect(`http://${config.webInterface.ip}:${config.webInterface.port}`);

    socket.on('message', o => {
        channel
            .append('div')
            .html(`&lt;${o.from}&gt; ${o.text}`)
    });

    socket.on('viewers', o => {
        d3.select('.viewers')
            .html(o + ' user'+(o>1?'s':'')+' viewing')
    });

}
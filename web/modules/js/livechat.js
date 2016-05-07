import * as d3 from './d3';
import io from 'socket.io-client';

var channel = d3.select('.channel');

if (!channel.empty()) {

    var socket = io.connect(location.origin);

    socket.on('message', o => addLine(o));

    socket.on('viewers', o => {
        d3.select('.viewers')
            .html(o + ' user'+(o>1?'s':'')+' viewing')
    });

    d3.select('.message')
        .on('keydown', () => {
            d3.event.keyCode == 13 && sendMsg();
        });

    d3.select('.send')
        .on('keydown', () => sendMsg);

}

function addLine(o) {
    channel
        .append('div')
        .classed('msg', true)
        .html(`&lt;${o.from}&gt; ${o.text}`)

    channel.node().scrollTop = channel.node().scrollHeight;
}

function sendMsg() {
    var msgEl = d3.select('.message');
    var msg = msgEl.property('value');
        msgEl.property('value', '');

    d3.json(location.origin+'/api/say?message='+msg+'&key='+secretKey, (e,r) => {
        console.log(r)
        addLine({from:'(server)', text:msg})
    })

}
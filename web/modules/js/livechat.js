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
    
    socket.on('topic', o => {
        d3.select('.topic').html('Topic: ' + o);
    });
    socket.on('nicks', o => {
        d3.select('.users')
            .selectAll('p')
            .data(o)
            .enter()
            .append('p')
            .html(d => d);
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
        .html(
            o.msg ? `${o.msg}: ${o.text}`:
            `&lt;${o.from}&gt; ${o.text}`
        )

    channel.node().scrollTop = channel.node().scrollHeight;
}

function sendMsg() {
    var msgEl = d3.select('.message');
    var msg = msgEl.property('value');
        msgEl.property('value', '');

    console.log(msg)

    if(msg.indexOf('/kick ') == 0) {

        var user = msg.substring(6);

        d3.json('/api/kick?user='+user+'&key='+secretKey, (e,r) => {
            addLine({msg:'kicked', text:user})
        })
    }
    else if (msg.indexOf('/mode ') == 0) {

        var a = msg.split(" ");

        d3.json('/api/mode?user='+a[2]+'&mode='+a[1]+'&key='+secretKey, (e,r) => {
            addLine({msg:'set mode', text:a[1]+' '+a[2]})
        })
    }
    else {
        d3.json('/api/say?message='+msg+'&key='+secretKey, (e,r) => {
            console.log(r)
            addLine({from:'(~˘▾˘)~', text:msg})
        })
    }
}
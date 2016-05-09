import * as d3 from './d3';

let log = d3.select('.log');

let id = null;

if (!log.empty()) {
    var data = log.select('.data');
    get();
}

let commandColour = {
    mode: '#A0A',
    join: '#0AF',
    part: '#FA0',
    nick: '#FA0',
    quit: '#A00'
}
window.onscroll = function(ev) {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight-200) {
        get();
    }
};

function get() {

    let url = '/api/log?limit=100';
    if (id) url += '&id='+id;

    d3.json(url, (e,r) => {

        console.log(r);
        let entry = data.selectAll('.entry')
            .data(r, d => d.id)
            .enter()
            .append('div')
            .classed('entry', true)

        entry.each(function(d) {
                let command = d.command.toLowerCase();
                (command != 'privmsg') &&
                    d3.select(this)
                        .append('div')
                        .classed('command', true)
                        .style('color', commandColour[command])
                        .html(command)

                id = d.id;
            })
            // fade
            .style('opacity', 0)
            .transition()
            .duration(900)
            .delay((d,i) => i*100)
            .style('opacity', 1)

        entry.append('div')
            .classed('user', true)
            .html(d => 
                d.command.toLowerCase() == 'privmsg' ?
                '&lt;' + d.user + '&gt;' : d.user
            )

        entry.append('div')
            .classed('message', true)
            .html(d => d.message)

        entry.append('div')
            .classed('time', true)
            .html(d => d.time)



        entry.append('hr')

        console.log(id);

    })
}
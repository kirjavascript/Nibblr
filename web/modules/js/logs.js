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

function get() {
    d3.json('/api/log?limit=100', (e,r) => {
        let entry = data.selectAll('.entry')
            .data(r)
            .enter()
            .append('div')
            .classed('entry', true)

        entry.append('div')
            .classed('time', true)
            .html(d => d.time)

        entry.append('div')
            .classed('command', true)
            .style('color', d => commandColour[d.command.toLowerCase()])
            .html(d => d.command.toLowerCase())

        entry.append('div')
            .classed('user', true)
            .html(d => '&lt;' + d.user + '&gt;')

        entry.append('div')
            .classed('message', true)
            .html(d => d.message)

        entry.append('hr')

    })
}
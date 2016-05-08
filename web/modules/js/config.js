import * as d3 from './d3';

let saveConfig = d3.select('.saveConfig')
    .on('click', () => {
        let code = d3.select('.config > textarea').property('value');

        try {
            JSON.parse(code);

            d3.json('/api/config?config='+encodeURIComponent(code)+'&key='+secretKey,
                (e,r) => {
                    if(r.status=="success") {
                        msg('saved!')
                    }
                    else {
                        msg(r.status, 'error')
                    }
                });
        }
        catch(e) {
            msg(e, 'error')
        }
    })

function msg(msg, type='success') {
    saveConfig
        .append('div')
        .classed(type, true)
        .html(msg)
        .transition()
        .duration(1800)
        .style('opacity', 0)
        .remove();
}
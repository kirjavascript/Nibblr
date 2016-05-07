import './livechat';
import * as d3 from './d3';

let passEl = d3.select('#password')
    .on('keydown', () => {
        d3.event.keyCode == 13 && login();
    });

d3.select('#login')
    .on('click', login)

function login() {
        let pass = passEl.property('value');
        d3.json('/login?pass='+pass, (e,r) => {
            if(r.success) {
                d3.select(document.body)
                    .style('opacity', 1)
                    .transition()
                    .duration(250)
                    .style('opacity', 0)
                    .on('end', d => location.reload())
            }
            else {
                passEl.style('color', 'red')
            }
        });
    }
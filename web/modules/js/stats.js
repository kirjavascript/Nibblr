import * as d3 from './d3';
import linecount from './stats/linecount';

let stats = d3.select('.stats');

if (!stats.empty()) {

    d3.json('/api/stats', (e,data) => {

        linecount(data.linecount);

        console.log(data);

    });

    
}
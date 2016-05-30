import * as d3 from './d3';
import bar from './stats/bar';

let stats = d3.select('.stats');

if (!stats.empty()) {

    let dateConf = {
        format: date2str
    }

    let fromEl = document.querySelector('.from');
    let toEl = document.querySelector('.to');

    let monthAgo = new Date();

    monthAgo.setMonth(monthAgo.getMonth()-1);

    fromEl.value = date2str(monthAgo);
    toEl.value = date2str();

    getStats(fromEl.value, toEl.value);

    d3.select('.setRange').on('click', () => {
        getStats(fromEl.value, toEl.value);
    })
}

function date2str(dt = new Date()) {
    return dt.toISOString().slice(0,10)
}

function getStats(from, to) {

    // calc range

    let fromDate = new Date(from);
    let toDate = new Date(to);

    let diff = Math.abs(fromDate.getTime() - toDate.getTime());
    let dayDiff = Math.ceil(diff / (1000 * 3600 * 24));

    let status = document.querySelector('.status');

    status.textContent = 'loading...';

    let url = `/api/stats?from=${from}&to=${to}`;

    d3.json(url, (e,data) => {

        status.textContent = `(${dayDiff} day${dayDiff>1?'s':''})`

        let linecount = data.linecount.map(d => ({user:d.user,count:d['count(*)']})).reverse();

        bar(linecount,'.linecount');

        bar(data.wordcount, '.wordcount');

    });

}


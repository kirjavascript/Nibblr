import * as d3 from './d3';
import d3cloud from 'd3-cloud';

let cloud = d3.select('.wordcloud');

if (!cloud.empty()) {
    const fill = d3.scaleCategory20();

    const layout = d3cloud()
        .size([window.innerWidth, 800])
        .words(cloudData)
        .padding(5)
        .font("Impact")
        .timeInterval(250)
        .fontSize(d => d.size)
        .on("end", draw);

    layout.start();

    function draw(words) {
        d3.select("body").append("svg")
        .attr("width", layout.size()[0])
        .attr("height", layout.size()[1])
        .append("g")
        .attr("transform", `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => '0px')
        .style("font-family", "Impact")
        .style("fill", (d, i) => fill(i))
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.text)
        .transition()
        .duration(1200)
        .style("font-size", d => `${d.size}px`)
    }
}


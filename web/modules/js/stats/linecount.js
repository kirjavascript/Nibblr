import * as d3 from './../d3';

export default function(data) {

    data = data.map(d => ({user:d.user,count:d['count(*)']})).reverse()

    let margin = {top: 20, right: 20, bottom: 60, left: 80},
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    let svg = d3.select(".linecount").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0])

    let xScale = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.user))

    let yAxis = d3.axisLeft(yScale).ticks(10);
    let xAxis = d3.axisBottom(xScale);

    yAxis.tickSizeInner(-width);

    svg
        .append("g")
        .attr("class", "axis")
        .call(yAxis);

    svg
        .append("g")
        .attr("class", "axis")
        .call(xAxis)
        .attr("transform", `translate(0,${height})`)
        .selectAll('text')
        .attr("dx", "-3em")
        .attr("dy", ".5em")
        .attr('transform', d => `rotate(-45)`)

    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .classed('bar',1)
        .attr('x', d => xScale(d.user))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', '#0F0')
        .attr('stroke', 'darkgreen')
        .attr('stroke-width', '2')
        .attr('y', height)
        .transition()
        .duration(200)
        .delay((d,i) => ((Math.random()*30)|0)*20)
        .ease(d3.easeElastic)
        .attr('height', d => height - yScale(d.count))
        .attr('y', d => yScale(d.count))
}

import * as d3 from './d3';

var commandList = {};

var commands = d3.select('.commands');

var state = {};

if (!commands.empty()) {

    let editor = ace.edit("editor");

        editor.$blockScrolling = Infinity;
        editor.getSession().setUseWorker(false);
        editor.setTheme("ace/theme/tomorrow_night_bright");
        editor.getSession().setMode("ace/mode/javascript");
        editor.setOptions({fontSize: "12pt", wrap: true});

    update();

}

function update() {
    d3.json('/api/commands', (e,r) => {
        commandList = r;
        makeList();
    })
}

function makeList() {

    d3.select('.qty').html('('+commandList.length+' total)')

    let list = d3.select('.list');

    list.html('');

    list
        .selectAll('.command')
        .data(commandList)
        .enter()
        .append('div')
        .classed('command', true)
        .attr('data-name', d => d.name)
        .html(d => { 

            let locked = d.locked=='true';
            let lockState = locked?'unlock':'lock';

            let out = `~${d.name} `;

            if (d.locked=='true')
                out += '<i class="fa fa-lock red" aria-hidden="true"></i>';

            if (!locked || admin)
                out += `<i data-tooltip="delete" 
                class="delete fa fa-ban  action" aria-hidden="true"></i>`;

            if(admin)
                out += `<i data-tooltip="${lockState}" 
                class="${lockState} fa fa-${lockState} action" aria-hidden="true"></i>`;

            if (!locked || admin)
                out += `<i data-tooltip="edit" 
                class="edit fa fa-code action" aria-hidden="true"></i>
            <i data-tooltip="rename" 
                class="rename fa fa-pencil action" aria-hidden="true"></i>`;

            out += `<span class="tooltip"></span><hr />`;

            return out;
        })

    // actions

    list
        .selectAll('.edit')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');

            parent.transition().duration(250).style('color','#FA0')

            setStatus(`editing`);
            // add save/cancel to block              

            let command = commandList.find(d => d.name == name);
            write(command.command);
        })

    list
        .selectAll('.lock, .unlock')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let type = d3.select(this).classed('lock')?'lock':'unlock';
            let url =  '/api/commands/'+type+'?name='+name+'&key='+secretKey;        
            d3.json(url, (e,r) => {
                update();
            }) 
        })

    // tooltips

    list
        .selectAll('.action')
        .on('mouseenter', function() {
            d3.select(this.parentNode)
                .select('.tooltip')
                .html(d3.select(this).attr('data-tooltip'))
        })
        .on('mouseleave', function() {
            d3.select(this.parentNode)
                .select('.tooltip')
                .html('')
        })

        // tick for save

        // check for syntax errors befor saving
}

function read() {
    return ace.edit("editor").getValue();
}

function write(str) {
    ace.edit("editor").setValue(str, -1);
}


function setStatus(str) {
    d3.select('.status')
        .html(str)
        .style('transform', "translate(200%,0)")
        .transition()
        .duration(300)
        .style('transform', "translate(0%,0)")
}
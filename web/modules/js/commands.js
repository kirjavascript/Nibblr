import * as d3 from './d3';

var commandList = {};

var commands = d3.select('.commands');

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
    d3.json(location.origin + '/api/commands', (e,r) => {
        commandList = r;
        makeList();
    })
}

function makeList() {

    let list = d3.select('.list');

    list.html('');

    list
        .selectAll('.command')
        .data(commandList)
        .enter()
        .append('div')
        .classed('command', true)
        .attr('data-name', d => d.name)
        .html(d => { let lockState =  d.locked=='true'?'unlock':'lock';
            return `~${d.name} 
            ${d.locked=='true'?'<i class="fa fa-lock red" aria-hidden="true"></i>':''}

            <i data-tooltip="delete" 
                class="delete fa fa-ban  action" aria-hidden="true"></i>
            <i data-tooltip="${lockState}" 
                class="${lockState} fa fa-${lockState} action" aria-hidden="true"></i>
            <i data-tooltip="edit" 
                class="edit fa fa-code action" aria-hidden="true"></i>
            <i data-tooltip="rename" 
                class="rename fa fa-pencil action" aria-hidden="true"></i>

            <span class="tooltip"></span>
        <hr />`})

    // actions

    list
        .selectAll('.edit')
        .on('click', function() {
            let name = d3.select(this.parentNode).attr('data-name');
            
            var command = commandList.find(d => d.name == name);

            write(command.command)
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
}

function read() {
    return ace.edit("editor").getValue();
}

function write(str) {
    ace.edit("editor").setValue(str);
}



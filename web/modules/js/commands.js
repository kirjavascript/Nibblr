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

            let out = `~<span class="name">${d.name}</span> `;

            if (d.locked=='true')
                out += '<i class="fa fa-lock red" aria-hidden="true"></i>';

                out += `<i data-tooltip="delete" 
                    class="delete fa fa-ban  action ${!locked || admin?'':'action-disabled'}" aria-hidden="true"></i>
                <i data-tooltip="${lockState}" 
                    class="${lockState} fa fa-${lockState} action ${admin?'':'action-disabled'}" aria-hidden="true"></i>
                <i data-tooltip="rename" 
                    class="rename fa fa-pencil action ${!locked || admin?'':'action-disabled'}" aria-hidden="true"></i>
                <i data-tooltip="edit" 
                    class="edit fa fa-code action ${!locked || admin?'':'action-disabled'}" aria-hidden="true"></i>
                <i data-tooltip="view" 
                    class="view fa fa-book action" aria-hidden="true"></i>
                    `;

            out += `<span class="tooltip"></span><hr />`;

            return out;
        })

    // actions

    list
        .selectAll('.rename')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let url =  '/api/commands/rename?name='+name;

            if(admin) url += '&key='+secretKey;

            let nameEl = parent.select('.name').html('');

            let newName = nameEl.append('input').property('value', name)

            confirm(parent, 'confirm rename', 
                () => d3.json(url+'&new='+newName.node().value, update), 
                () => nameEl.html(name));
        })

    list
        .selectAll('.view')
        .on('click', function() {
            resetConfirm();
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let command = commandList.find(d => d.name == name);
            write(command.command);
        })

    list
        .selectAll('.edit')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let url =  '/api/commands/edit?name='+name;

            if(admin) url += '&key='+secretKey;

            let command = commandList.find(d => d.name == name);
            write(command.command);

            confirm(parent, 'save changes', () => {
                let command = read();
                try {
                    new Function(command);
                    d3.json(url + '&command='+encodeURIComponent(command),
                        (e,r) => {
                            if(r.status=="success") {
                                parent
                                    .select('.confirm')
                                    .style('color', '#0A0')
                                    .html('changes saved')
                                    .transition()
                                    .duration(800)
                                    .style('opacity', 0)
                                    .on('end', update)
                                    .remove();
                            }
                        });
                }
                catch(e) {
                    parent
                        .append('div')
                        .classed('error', true)
                        .html(e)
                        .transition()
                        .duration(1800)
                        .style('opacity', 0)
                        .remove();
                }

            });
        })

    list
        .selectAll('.lock, .unlock')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let type = d3.select(this).classed('lock')?'lock':'unlock';
            let url =  '/api/commands/'+type+'?name='+name+'&key='+secretKey;        
            d3.json(url, update);
        })

    list
        .selectAll('.delete')
        .on('click', function() {
            let parent = d3.select(this.parentNode);
            let name = parent.attr('data-name');
            let url =  '/api/commands/delete?name='+name;

            if(admin) url += '&key='+secretKey;

            confirm(parent, 'confirm delete', () => d3.json(url, update));
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

function confirm(parent, action, yes = ()=>{}, no = ()=>{}) {

    let cancel = d3.selectAll('.cancel');

    if(cancel.size()) {
        cancel.on('click')()
        draw();
    }
    else {
        draw();
    }

    function draw() {
        let confirmEl = parent
            .append('div')
            .classed('confirm', true)
            .html(`${action} `);

        confirmEl
            .append('i')
            .attr('class', 'green fa fa-check')
            .attr('aria-hidden', 'true')
            .on('click', d => {
                yes();
            })

        confirmEl
            .append('i')
            .attr('class', 'red fa fa-times cancel')
            .attr('aria-hidden', 'true')
            .on('click', d => {
                no();
                confirmEl
                    .transition()
                    .duration(300)
                    .style('transform', "translate(200%,0)")
                    .remove();
            })

        confirmEl
            .style('transform', "translate(200%,0)")
            .transition()
            .duration(300)
            .style('transform', "translate(0%,0)")
    }
    
}

function resetConfirm() {

    let cancel = d3.selectAll('.cancel');

    if(cancel.size()) {
        cancel.on('click')()
    }
}
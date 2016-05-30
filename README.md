           __ __    __    __      
    .-----|__|  |--|  |--|  .----.
    |     |  |  _  |  _  |  |   _|
    |__|__|__|_____|_____|__|__|

Nibblr is a javascript framework for writing IRC bots. 

It supports on the fly programming of commands via the web dashboard or directly in channel.

...

It comes with a built in javascript interpreter in the form of `~eval` which exposes a few APIs (which you can find with `~eval Object.keys(this)`).

New commands can be dynamically added to the bot on the fly with `~commands.[name] function(){}` and are stored in a database (the one in this repo contains many examples). `~commands.[name]` alone will show the source for the command.

If you pass a function as a command, it will be called with the parameters (command, tokens, {from, to, text, message}), where command is the full text of the parameters used to call the command, tokens is an array of the parameters (split by spaces) and the third param contains an object of client data.

One particularly useful function available is `wget(url, callback(jQuery, body))`. 

For example, to add a command for currency conversion you can type: `~commands.xe (b,a) => {if(a.length<3) return "~xe AMOUNT FROM TO";else return wget("http://www.xe.com/currencyconverter/convert/?Amount="+a[0]+"&From="+a[1]+"&To="+a[2],a => html2txt(a('.uccRes').html()))}`

Then, calling `~xe 1 GBP USD` will result in an output of `1.00 GBP = 1.44301 USD`

There are a few built in commands, like `~remind(time) message` and `~memo(user [,time]) message`. A full list of commands can be seen with `~commands.list`

`npm start` and `npm stop` are set call forever to run the process as a daemon.

All the code is run in a sandboxed environment with various failsafes.

Before running, rename `config.json.example` to `config.json` and configure your settings.

Nibblr uses node, express, hogan.js, SQLite3, socket.io, webpack, babel and d3.
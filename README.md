Nibblr
======

Nibblr is an IRC bot written for #8bitvape on irc.rizon.net

It comes with a built in javascript interpreter in the form of `~eval` which exposes a few APIs (which you can find with `~eval Object.keys(this)`)

New commands can be dynamically added to the bot on the fly with `~commands.name function(){}` and stored in an SQLite database (the one in this repo is the live one from #8bitvape with various examples).

All the code is run in a sandboxed environment with various failsafes.

For further documentation, read the source code.
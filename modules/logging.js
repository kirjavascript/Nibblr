module.exports = function(obj) {

    obj.client.addListener('raw', msg => {
        if (~("JOIN PART NICK KICK KILL MODE PRIVMSG QUIT TOPIC".split(" ").indexOf(msg.command))) {

            obj.db.run("INSERT INTO log(user,command,message) VALUES (?,?,?)", 
                [msg.nick, msg.command, msg.args.join(" ")]);

        }
    })

}

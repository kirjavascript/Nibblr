var log = require('../index').log;

module.exports = function(client) {

    client.addListener('raw', msg => {
        if (~("JOIN PART NICK KICK KILL MODE PRIVMSG QUIT TOPIC".split(" ").indexOf(msg.command))) {

            let args = msg.args;

            if (msg.command.toUpperCase() == 'QUIT') {
                args = [msg.nick, msg.command, '', args.join(" ")]
            }
            else {
                args = [msg.nick, msg.command, args.length?args[0]:'', args.splice(1).join(" ")]
            }

            log.run("INSERT INTO log(user,command,target,message) VALUES (?,?,?,?)", args);

        }
    })

    

}

var sqlite3 = require("sqlite3");
var db = new sqlite3.Database('8bvlog.db');

db.all("SELECT * from log", (e,d) => {
    db.serialize(function() {

        d.forEach(r => {

            if(r.command != "QUIT") {
                var comm = r.message.split(" ")
                db.run('UPDATE log SET target = ?,message = ? WHERE windex = ?',
                    [comm[0], comm.splice(1).join(" "),r.windex]
                )
            }
        })

    });

})
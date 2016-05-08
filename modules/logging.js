module.exports = function(obj) {

    obj.db.run("INSERT INTO commands(name,command) VALUES (?,?)", [name, command]);

}
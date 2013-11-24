Bookshelf  = require('bookshelf').db;
Participant = require('./participant')
Room = require('./room')

module.exports = Bookshelf.Model.extend({
    tableName: 'messages',
    participant: function() {
        return this.belongsTo(Participant)
    },
    room: function() {
        return this.belongsTo(Room)
    }
});

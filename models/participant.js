Bookshelf  = require('bookshelf').db;
Room = require('./room')
Message = require('./message')
_ = require('underscore')

module.exports = Bookshelf.Model.extend({
    tableName: 'participants',
    defaults: {
        lastSeen:  new Date(),
        state: "maximized"
    },
    room: function() {
        return this.belongsTo(Room)
    },
    messages: function() {
        return this.hasMany(Message)
    },
    initialize: function() {
        // Every time the participant object is updated, update the client
        this.on("saved", this.sendData)
    },
    sendData: function() {
        console.log("sending room data!")
        this.load(['room', 'room.participants'])
        .then(function(p) {
            p = p.toJSON()
            console.log(p)
            p.room.participants = _.pluck(p.room.participants, "username")
            console.log(p)

            app.io.sendToUser(p.course, p.username, 'participant', p)
        })
        
    }
});

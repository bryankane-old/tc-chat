var Bookshelf  = require('bookshelf').db;
var Room = require('./room')

module.exports = Bookshelf.Model.extend({
    tableName: 'participants',
    defaults: {
        lastSeen:  new Date(),
    },
    room: function() {
        return this.belongsTo(Room)
    },
    initialize: function() {
        // Every time the participant object is updated, update the client
        this.on("saved", this.sendData)
    },
    sendData: function() {
        // Load the associated `room` for this participant
        this.load('room').then(function(participant) {

            // Determine which course this participant is in
            course = participant.related('room').get('course')

            // Serialize the participant object data
            participantData = participant.toJSON({shallow: true})

            // Send the participant object data to the user
            app.io.sendToUser(course, participant.get('username'), 'participant', participantData)
            
        })
    }
});

express = require('express.io')
app = express().http().io()

db = require('./db')

_ = require('underscore')

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});


// Load in models
Room = require('./models/room')
Participant = require('./models/participant')
Message = require('./models/message')


// Load in collections
ParticipantList = require('./collections/participant_list')


app.io.route('user', {
    login: function(req) {
        /* 
            Logs the user into the chat system
         */
        course = req.data.course
        username = req.data.username
        req.socket.set("course", course)
        req.socket.set("username", username)
        var userRoom = course + "_" + username
        req.io.join(userRoom)
        req.io.emit('login', 'loggedin')
    }
})

getUserData = function(req, cb) {
    req.socket.get("course", function(err, course) {
        req.socket.get("username", function(err, username) {
            cb(course, username)
        })
    })
}

// Set up a global function that lets us communicate with a user
app.io.sendToUser = function(course, username, event, data) {
    // console.log("sending:")
    // console.log("room: " + course + "_" + username)
    // console.log("event: " + event)
    // console.log("data: " + data)
    app.io.room(course + "_" + username).broadcast(event, data)
}

app.io.route('room', {
    create: function(req) {
        /* 
            Creates a new room, and adds specified participants
            (If the room already exists, returns the existing room)
         */

        // load the list of participants from the request
        participants = req.data.participants

        // load in the course and current username from the socket properties
        getUserData(req, function(course, username){

            // Create the room object
            new Room({ course: course }).save().then(function(rm) {

                // Create a participant object for each participant
                _.each(participants, function(pUser) {
                    new Participant({ room_id: rm.id, username: pUser }).save()
                })
            })
        })
    }
})


app.io.route('participant', {
    state: function(req) {
        /*
            Updates the state of a participant.
            States can be: "open", "minimized", or "closed"
         */

        // load the room and new state from the request data
        room_id = req.data.room
        state = req.data.state

        // load in the course and current username from the socket properties
        getUserData(req, function(course, username){

            // fetch the participant model for the given user and room
            // and then save it with the updated state
            new Participant({room_id: room_id, username: username})
                .fetch({require: true})
                .then(function(p) {
                    p.save({state: state}, {patch: true})
                })
        })

        
    },
    touch: function(req) {
        /* 
            Updates the 'lastSeen' property with the current timestamp
         */
        
        // load the room from the request data
        room_id = req.data.room

        // load in the course and current username from the socket properties
        getUserData(req, function(course, username){

            // fetch the participant model for the given user and room
            // and then save it with the updated timestamp
            new Participant({room_id: room_id, username: username})
                .fetch({require: true})
                .then(function(p) {
                    p.save({lastSeen: new Date()}, {patch: true})
                })
        })
    }
})

app.io.route('message', {
    send: function(req) {
        /* 
            Sends a message in a given room
         */

        // load the room and message from the request data
        room_id = req.data.room
        msg = req.data.message

        // load in the course and current username from the socket properties
        getUserData(req, function(course, username){

            // fetch the participant model for the given user and room
            new Participant({room_id: room_id, username: username})
                .fetch({require: true})
                .then(function(p) {

                    // Create a new message from the given participant
                    new Message({participant: p.id, message: msg}).save()

                        // After the message is saved, send it to everyone in the room
                        .then(function() {
                            new ParticipantList()
                                .query()
                                .where({room_id: room_id})
                                .select()
                                .then(function(participants) {
                                    participants.map(function(p) {
                                        app.io.sendToUser(course, p.username, "message", msg)
                                    })
                                })
                        })
                })
        })
    }
})

app.listen(2002)

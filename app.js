express = require('express.io')
app = express().http().io()

db = require('./db')

_ = require('underscore')


// Load in models
Room = require('./models/room')
Participant = require('./models/participant')


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
                _.each(participants, function(p) {
                    new Participant({ room: rm.id, username: p }).save()
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

        console.log("update participant state")
        
    },
    touch: function(req) {
        /* 
            Updates the 'lastSeen' property with the current timestamp
         */
        
        console.log("touch")
    }
})

app.io.route('message', {
    send: function(req) {
        /* 
            Sends a message in a given room
         */

        console.log("send message")
        
    }
})

app.listen(2002)

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

    // Load all rooms that the user is in, along with all associated messages
    new ParticipantList()
      .query('where', {"username": username, "course": course})
      .fetch({withRelated: ['room', 'room.messages', 'room.participants']})
      .then(function(participants) {

        // Create the mega-data-structure that contains everything the chat system needs to start
        // So for each room, include other participants and all messages in it

        // For each room the user is in...
        participantData = participants.map(function(p) {

          // ...load all of the messages in the room
          messages = p.related('room').related('messages')

          // and for each message that's loaded
          messages = messages.map(function(m) {

            // figure out who sent it, and return the timestamp and message content
            sender = p.related('room').related('participants').get(m.get('participant_id')).get('username')

            return {
                user: sender,
                timestamp: m.get('timestamp'),
                message: m.get('message')
            }
          })

          p.set('messages', messages)

          // ...figure out the username of each person in the room
          p.set('participants', p.related('room').related('participants').pluck("username"))

          return p.toJSON({shallow: true})
        })

        // Send the user the initial data necessary to start the chat application
        req.io.emit('bootstrap', participantData)
      })
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
  console.log("sending:")
  console.log("room: " + course + "_" + username)
  console.log("event: " + event)
  console.log("data: " + data)
  app.io.room(course + "_" + username).broadcast(event, data)
}

app.io.route('users', {
  online: function(req) {
    /* 
      Returns the list of users who are presently online
     */
    getUserData(req, function(course, username) {
      connectedSockets = app.io.sockets.clients()
      _.each(connectedSockets, function(sock) {
        sock.get("username", function(err, u) {
          app.io.sendToUser(course, username, 'online', u)
        })
      })
    })
  }
})

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
      console.log("COURSE: " + course)

      // Create the room object
      new Room().save().then(function(rm) {

        // Create a participant object for each participant
        _.each(participants, function(pUser) {

          // By default, the chat room should be closed for everyone except the creator
          // The room will then be opened for everyone else on the first message
          state = "closed"
          if (pUser == username) {
            state = "maximized"
          }
          new Participant({ room_id: rm.id, username: pUser, course: course, state: state }).save()
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
    pId = req.data.room
    state = req.data.state

    // load in the course and current username from the socket properties
    getUserData(req, function(course, username){

      // fetch the participant model for the given user and room
      // and then save it with the updated state
      new Participant({id: pId})
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
    pId = req.data.room

    // load in the course and current username from the socket properties
    getUserData(req, function(course, username){

      // fetch the participant model for the given user and room
      // and then save it with the updated timestamp
      new Participant({id: pId})
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
    pId = req.data.room
    msg = req.data.message

    // load in the course and current username from the socket properties
    getUserData(req, function(course, username){

      // The first thing we need to do is figure out who sent the message
      // (we pre-fetch some other stuff here to make later queries quicker)
      new Participant({id: pId})
        .fetch({withRelated: ['room.participants']})
        .then(function(p) {

        // Now that we know who sent it, we can save the message
        new Message({participant_id: p.get('id'), message: msg, room_id: p.get('room_id'), timestamp: new Date() }).save()

          // After the message is saved, send it to everyone in the room
          .then(function(msgObj) {

              // Create a nice object that contains everything we need about the message
              messageData =  {
                  user: p.get('username'),
                  timestamp: msgObj.get('timestamp'),
                  message: msgObj.get('message')
              }

              // Get the room that this message was sent to
              room = p.related('room')

              // And from that, figure out who else is in the room
              others = room.related('participants')

              // For each person in the room this message was sent to...
              others.each(function(o) {

                // ...make sure their chat window is open
                if (o.get('state') == "closed") {
                  o.save({state: "maximized"}, {patch: true})
                }

                // ...and then send them the message
                app.io.sendToUser(o.get('course'), o.get('username'), "message", {message: messageData, room: o.get('id')})
              })
            })
        })
    })
  }
})

app.listen(2002)

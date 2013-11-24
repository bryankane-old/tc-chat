var Bookshelf  = require('bookshelf').db;
var Participant = require('../models/participant')

module.exports = Bookshelf.Collection.extend({
	model: Participant
});

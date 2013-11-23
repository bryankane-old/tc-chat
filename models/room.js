var Bookshelf  = require('bookshelf').db;
var Participant = require('./participant')

module.exports = Bookshelf.Model.extend({
	tableName: 'rooms',
	participants: function() {
		return this.hasMany(Participant)
	}
});

var Bookshelf  = require('bookshelf').db;
var Participant = require('./participant')

module.exports = Bookshelf.Model.extend({
	tableName: 'messages',
	participant: function() {
		return this.belongsTo(Participant)
	}
});

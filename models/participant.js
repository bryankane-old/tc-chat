var Bookshelf  = require('bookshelf').db;

module.exports = Bookshelf.Model.extend({
	tableName: 'participants',
	defaults: {
    	lastSeen:  new Date(),
    }
});

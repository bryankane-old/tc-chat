Bookshelf  = require('bookshelf').db;

module.exports = Bookshelf.Model.extend({
	tableName: 'rooms',
	participants: function() {
        return this.hasMany(require('./participant'))
    },
    messages: function() {
        return this.hasMany(require('./message'))
    },
});

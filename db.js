var Bookshelf = require('bookshelf');

Bookshelf.db = Bookshelf.initialize({
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'chat',
    password : 'chat',
    database : 'chat',
    charset  : 'utf8',
  }
});

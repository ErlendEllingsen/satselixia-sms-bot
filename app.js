var express = require('express')
var app = express()

app.get('/', function (req, res) {
  res.send('Hello World')
});

app.post('/inbound', function (req, res) {
    res.send('Hello World (post)');
});

app.listen(60000);
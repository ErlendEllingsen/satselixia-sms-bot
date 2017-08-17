var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
  res.send('Hello World')
});

app.post('/inbound', function (req, res) {
    res.send('Hello World (post)')
    fs.writeFileSync('body.json', JSON.stringify(req.body));
});

app.listen(60000);
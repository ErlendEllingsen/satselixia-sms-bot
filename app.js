var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var twilio = require('twilio');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }))

//Load config
var config = JSON.parse(fs.readFileSync('./config.json').toString());
config.twilio.client = new twilio(config.twilio.accountSid, config.twilio.authToken);
config.tools = {};
config.tools.replaceAll = function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

//Load modules
var ChatBot = require('./modules/ChatBot');
var DepartmentUpdater = new (require('./modules/DepartmentUpdater'))(config);

DepartmentUpdater.update();


//Routing
app.get('/', function (req, res) {
  res.send('Hello World')
});

app.post('/inbound', function (req, res) {

    if (req.body.From == undefined || req.body.Body == undefined) return; //Don't even bother logging.
    //Length > 20 probably means some sort of silly attempt at damaging our little pretty service.
    if (req.body.From.length > 20 || req.body.Body.length > 20) return; //Same as above, don't bother

    var cb = new ChatBot(req.body.From, req.body.Body, config, req, res);
    console.log('[' + new Date().toLocaleString() + '] New incoming msg from ' + req.body.From + ': ' + req.body.Body);
    cb.run();

    //end /inbound
});

app.listen(60000);
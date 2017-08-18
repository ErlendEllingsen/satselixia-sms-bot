var request = require('request');


/**
 * External functions for calculating Levenshtein distance (https://en.wikipedia.org/wiki/Levenshtein_distance) on two strings.
 * Thanks to @overlord1234 at Stack Overflow.
 * Link to source: https://stackoverflow.com/a/36566052
 * 
 */

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
            costs[j] = j;
        else {
            if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
                newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
            }
        }
        }
        if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];

    //end editDistance
}

function similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);

    //end similarity
}


module.exports = function(receiver, body, config, req, res) {
    var self = this;

    this.receiver = receiver;
    this.body = body; 

    //--- Departments ---
    this.departments = config.departments;

    this.parse = function() {

        var response = null;

        if (self.body.toLowerCase().indexOf('tider ') != -1 || self.body.toLowerCase().indexOf('åpningstider ') != -1) {
            response = self.replies.openingHours();
        }

        if (self.body.toLowerCase().indexOf('møllestatus ') != -1 || self.body.toLowerCase().indexOf('møller ') != -1) {
            response = self.replies.treadmillsAvailability();
        }

        if (self.body.toLowerCase().indexOf('gruppetimer ') != -1 || self.body.toLowerCase().indexOf('timer ') != -1) {
            response = self.replies.groupSessions();
        }

        if (response == null) response = 'Ukjent kommando.';
        if (response == true) return; //If a sub-method returns true, a message will be given later.

        //SEND SMS to number 
        //For now: send json reply
        self.respond(response);

        //end this.parse
    }

    this.findDepartment = function(searchStr) {
        //--- Search through all departments ----
        var departmentObj = null;
        for (var i = 0; i < config.departments.length; i++) {

            var matchDept = config.departments[i];
            var foundSimilarity = similarity(searchStr, matchDept.name);
            if (foundSimilarity >= config.similarityTreshold) departmentObj = matchDept;
        }
        return departmentObj;
    }

    this.findGroupSessions = function(departmentObj, callback) {

        
        var d = new Date();
        var year = d.getFullYear();
        var month = (d.getMonth() + 1);
        var date = d.getDate();
        month = (month < 10 ? '0' + month : month);
        date = (date < 10 ? '0' + date : date);

        request(departmentObj.url, function(err, data){

            var d = new Date();
            var year = d.getFullYear();
            var month = (d.getMonth() + 1);
            var date = d.getDate();
            month = (month < 10 ? '0' + month : month);
            date = (date < 10 ? '0' + date : date);

            var centerId = data.body.split('setCenterId(')[1].split(')')[0];
        

            request('https://www.satselixia.no/sats-api/no/classes?centers=' + centerId + '&dates=' + year + month + date, function(err, data){

                var groupSessionsObject = JSON.parse(data.body);
                callback(groupSessionsObject);

                //end API call
            }); 

            //end fetch department 
        });

        //end findGroupSessions
    }

    this.respond = function(response) {

        //Log event
        console.log('[' + new Date().toLocaleString() + '] Responded to ' + self.receiver + ' with ' + response);
        
        //Respond to server
        res.set('Content-Type', 'text/xml');
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response/>');

        //Send sms!
        config.twilio.client.messages.create({
            body: response,
            to: self.receiver,  // Text this number
            from: config.twilio.from // From a valid Twilio number
        });

        //end
    }

    this.run = function() {
        //CALL!!
        self.parse();

        //end run
    }

    //Define replies
    this.replies = {};

    this.replies.openingHours = function() {

        var searchStr = self.body.split(' ');
        searchStr.splice(0,1);
        searchStr = searchStr.join(' ');

        var departmentObj = self.findDepartment(searchStr);
        if (departmentObj == null) return 'Ukjent treningssenter.'; 

        request(departmentObj.url, function(err, data){

            //var d = new Date();
            //var day = d.getDay();


            var body = data.body;

            var openingHoursTable = body.
                split('<td class="col-md-6">Ordin&#230;re &#229;pningstider:</td>')[1].
                split('</table>')[0];

            var openingDays = openingHoursTable.split('<tr>');
            openingDays.splice(0,1); //Remove first. Garbage data.

            var hours_export = '';
            for (var i = 0; i < openingDays.length; i++) {
                var openingDay = openingDays[i];
                var name = openingDay.split('<td class=\"col-md-6\">')[1].
                                      split('</td>')[0].trim();

                var hours = openingDay.split('<span class=\"pull-right\">')[1].
                                      split('</span>')[0];

                var openingHours = null;
                if (hours.toLowerCase().indexOf('stengt') != -1) {
                    openingHours = 'Stengt';
                } else {
                    hours = hours.split('-');

                    var opening = hours[0].trim();
                    var closing = hours[1].trim();
    
                    openingHours = opening + ' - ' + closing;
                }

                hours_export += (i == 0 ? '' : '\r\n') + name + ': ' + openingHours;

            }

            //Replace silly html encodings to norwegian letters
            hours_export = config.tools.replaceAll(hours_export, '&#248;', 'ø');

            self.respond('Åpningstidene på ' + departmentObj.name + ':\r\n\r\n ' + hours_export);

            //end department response
        });

        return true; //true indicates that a response will be given at a later time

        //end replies.openingHours
    }

    this.replies.treadmillsAvailability = function() {


        var searchStr = self.body.split(' ');
        searchStr.splice(0,1);
        searchStr = searchStr.join(' ');

        var departmentObj = self.findDepartment(searchStr);
        if (departmentObj == null) return 'Ukjent treningssenter.'; 

        self.findGroupSessions(departmentObj, function(groupSessionsObject){

            var groupSessionsList = '';
            for (var i = 0; i < groupSessionsObject.classes.length; i++) {
                var groupSession = groupSessionsObject.classes[i];
                if (groupSession.name.toLowerCase().indexOf('running') != -1) {
                    var startingDate = new Date(groupSession.startTime);
                    var start_hh = startingDate.getHours();
                    var start_mm = startingDate.getMinutes();
                    start_hh = (start_hh < 10 ? '0' + start_hh : start_hh);
                    start_mm = (start_mm < 10 ? '0' + start_mm : start_mm);
        

                    groupSessionsList += '\r\n' + groupSession.name + ' kl ' + start_hh + ':' + start_mm + ' (' + groupSession.durationInMinutes + ' min)';
                }
            }


            if (groupSessionsList.length <= 0) {
                self.respond('Ingen gruppetimer!');
                return;
            }

            self.respond(groupSessionsList);

    
            //end call to findGroupSessions
        });

        

        return true;

        //end replies.treadmillsAvailability
    }
    
    this.replies.groupSessions = function() {
        
        var searchStr = self.body.split(' ');
        searchStr.splice(0,1);
        searchStr = searchStr.join(' ');

        var departmentObj = self.findDepartment(searchStr);
        if (departmentObj == null) return 'Ukjent treningssenter.'; 

        self.findGroupSessions(departmentObj, function(groupSessionsObject){

            var groupSessionsList = '';
            for (var i = 0; i < groupSessionsObject.classes.length; i++) {
                var groupSession = groupSessionsObject.classes[i];
            
                var startingDate = new Date(groupSession.startTime);
                var start_hh = startingDate.getHours();
                var start_mm = startingDate.getMinutes();
                start_hh = (start_hh < 10 ? '0' + start_hh : start_hh);
                start_mm = (start_mm < 10 ? '0' + start_mm : start_mm);
    

                groupSessionsList += '\r\n' + groupSession.name + ' kl ' + start_hh + ':' + start_mm + ' (' + groupSession.durationInMinutes + ' min)';
            
            }


            if (groupSessionsList.length <= 0) {
                self.respond('Ingen gruppetimer!');
                return;
            }

            self.respond(groupSessionsList);

    
            //end call to findGroupSessions
        });


        return true;

        //end replies.groupSessions
    }
    

    //end ChatBot 
}
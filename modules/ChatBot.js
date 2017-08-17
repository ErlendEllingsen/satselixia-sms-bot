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

        if (self.body.toLowerCase().indexOf('tider ') != -1) {
            response = self.replies.openingHours();
        }

        if (response == null) response = 'Ukjent kommando.';
        if (response == true) return; //If a sub-method returns true, a message will be given later.

        //SEND SMS to number 
        //For now: send json reply
        self.respond(response);

        //end this.parse
    }

    this.respond = function(response) {

        //Send sms!
        config.twilio.client.messages.create({
            body: response,
            to: self.receiver,  // Text this number
            from: config.twilio.from // From a valid Twilio number
        });

        //Log event
        console.log('[' + new Date().toLocaleString() + '] Responded to ' + self.receiver + ' with ' + response);

        //Respond to server
        res.json({
            status: true
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

        //--- Search through all departments ----
        var departmentObj = null;
        for (var i = 0; i < config.departments.length; i++) {

            var matchDept = config.departments[i];
            var foundSimilarity = similarity(searchStr, matchDept.name);
            if (foundSimilarity >= config.similarityTreshold) departmentObj = matchDept;
        }


        //Did we match?
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

        //end 
    }

    

    

    //end ChatBot 
}
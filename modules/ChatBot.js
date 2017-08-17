var request = require('request');

module.exports = function(receiver, body, config, req, res) {
    var self = this;

    this.receiver = receiver;
    this.body = body; 


    //--- Departments ---
    this.departments = config.departments;

    this.parse = function() {

        var response = null;

        if (self.body.indexOf('tider ') != -1) {
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

        config.twilio.client.messages.create({
            body: response,
            to: self.receiver,  // Text this number
            from: config.twilio.from // From a valid Twilio number
        });

        res.json({
            status: true,
            resonse: response
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

        var searchPlace = self.body.split(' ')[1].trim().toLowerCase();

        var departmentObj = self.departments.filter(function ( obj ) {
            return obj.code === searchPlace;
        })[0];

        //Did we match?
        if (departmentObj == undefined) return 'Ukjent treningssenter.'; 

        console.log(departmentObj);

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
                hours = hours.split('-');

                var opening = hours[0].trim();
                var closing = hours[1].trim();

                hours_export += (i == 0 ? '' : '\r\n') + name + ': ' + opening + ' - ' + closing;

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
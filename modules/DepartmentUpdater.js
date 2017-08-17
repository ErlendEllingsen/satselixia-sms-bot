var request = require('request');

/**
 * This module queries and parses the SATS ELIXIA website and stores all the departments.
 */
module.exports = function(config) {

    var self = this;
    
    this.update = function() {

        request('https://www.satselixia.no/', function(err, data){

            var body = data.body;

            var fitnessCenters = body.split('<div class="drawer-list-item"><a href="/treningssentre/');
            fitnessCenters.splice(0,1); //Remove the first bs-data.

            var fitnessCenterArray = [];

            for (var i = 0; i < fitnessCenters.length; i++) {
                
                var fitnessCenter = fitnessCenters[i];

                var brandType = (fitnessCenter.toLowerCase().indexOf('-sats/') != -1 ? 'sats' : 'elixia');

                var fitnessCenterObj = {};
                
                //Configure the name
                var name = fitnessCenter.split('">')[1].split('</a></div>')[0].trim();
                name = config.tools.replaceAll(name, '&#248;', 'ø');
                name = config.tools.replaceAll(name, '&#229;', 'å');
                name = config.tools.replaceAll(name, '&#197;', 'Å');
                name = config.tools.replaceAll(name, '&#197;', 'Å');
            
                //Remove brand and whitespaces from the name
                name = config.tools.replaceAll(name, 'Trening', '');
                name = config.tools.replaceAll(name, brandType.toUpperCase(), '');
                name = name.trim();

                if (name.toLowerCase().indexOf(' bad') != -1) continue; //Skip swimming halls. E.g. "Røa bad".
                
                
                fitnessCenterObj.name = name;
                fitnessCenterObj.brand = brandType;
                fitnessCenterObj.code = fitnessCenter.split('/')[1].split('-' + brandType)[0];
                fitnessCenterObj.url = 'https://www.satselixia.no/treningssentre/' + fitnessCenter.split('">')[0].trim().toLowerCase();

                fitnessCenterArray.push(fitnessCenterObj);

                //end fitnessCenters loop
            }

            config.departments = fitnessCenterArray;
            console.log('[' + new Date().toString() + '] Loaded ' + config.departments.length + ' fitness centers..');
        
            //end request
        });

        //end this.update
    }

    //end DepartmentUpdater
}
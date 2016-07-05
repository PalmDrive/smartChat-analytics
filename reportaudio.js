var fs = require('fs');
var d3 = require('d3');
var math = require('mathjs');
var google =require('googleapis');
var key = require('./config/ga_keys.json');
var VIEW_ID = require('./config/ga_view_id.json')['viewId'];
var jwtClient = new google.auth.JWT(
    key.client_email, null, key.private_key,
    ['https://www.googleapis.com/auth/analytics.readonly'], null);

jwtClient.authorize(function (err, tokens) {
    if (err) {
        console.log(err);
        return;
    }
   var analytics = google.analytics('v3');
   queryLectures(analytics);
});



function queryLectures(analytics) {
    ask("Please input the live date: ", /[0-9]{4}-[0-9]{2}-[0-9]{2}/, function(livedate) {
        ask("Please input the lecture id: ", /.+/, function(id) {
            var d = new Date(livedate);
            d.setDate(d.getDate() + 6);
            var enddate = d.toJSON().substring(0,10);

            var today = new Date();
            if (today.getTime() < d.getTime()) {
                console.log("NO SEVEN DAYS");
                process.exit();
            }

            analytics.data.ga.get({
                'auth': jwtClient,
                'ids': VIEW_ID,
                'metrics': 'ga:uniqueEvents',
                'dimensions': 'ga:eventCategory,ga:eventAction',
                'start-date': livedate,
                'end-date': enddate,
                'sort': '-ga:uniqueEvents',
                'max-results': 1000, 
                'filters': 'ga:eventAction=~^play_audio$'   
            }, function (err, response) {
                if (err) {
                console.log(err);
                return;
                }

                var audio = response.rows.filter(function(value){
                    return value[0].indexOf(id)> -1;
                });

                var audiomod = audio.map(function(element){
                    element[0] = element[0].replace(/,group_id/,", group_id:");
                    var Obj = {};
                    Obj["eventCategory"] = element[0];
                    Obj["count"] = element[2];
                    return Obj;
                });

                var audiobylecture = d3.nest()
                .key(function(d) { return d.eventCategory; })
                .rollup(function(v) { return {
                total: d3.sum(v,function(d) {return d.count;})
                }; })
                .entries(audiomod);

                console.log(audiobylecture);
                process.exit();
            });
       
        });
    });
} 

function ask(question, format, callback) {
 var stdin = process.stdin, stdout = process.stdout;
 
 stdin.resume();
 stdout.write(question);
 
 stdin.once('data', function(data) {
   data = data.toString().trim();
 
   if (format.test(data)) {
     callback(data);
   } else {
     stdout.write("It should match: "+ format +"\n");
     ask(question, format, callback);
   }
 });
}

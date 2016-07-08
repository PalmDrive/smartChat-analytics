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
   queryTime(analytics);
});



function queryTime(analytics) {
   analytics.data.ga.get({
        'auth': jwtClient,
        'ids': VIEW_ID,
        'metrics': 'ga:uniqueEvents,ga:eventValue',
        'dimensions': 'ga:date,ga:eventCategory,ga:eventAction',
        'start-date': '8daysAgo',
        'end-date': 'yesterday',
        'sort':'ga:date',
        'filters': 'ga:eventAction=~^send_listen_duration:record_talk$'    
    }, function (err, response) {
        if (err) {
            console.log(err);
            return;
        }
        
        var data = response.rows.map(function(element){
            var Obj = {};
            Obj['date'] = element[0];
            Obj["eventCategory"] = element[1];
            Obj["eventAction"] = element[2];
            Obj["Timeperuser"] = element[4]/element[3];
            return Obj;
        });
        
        var databydate = d3.nest()
        .key(function(d) { return d.date; })
        .entries(data);

        var date_time = databydate.map(function(element){
            var object = {};
            object['date'] = element.key;
            object['AvgTime'] = d3.mean(element.values, function(d) {return d.Timeperuser;});
            console.log(element.key);
            console.log(object['AvgTime']);
            return object;
        })

        console.log(d3.mean(date_time, function(d) {return d.AvgTime})/3600);

        
        
        
    });
} 



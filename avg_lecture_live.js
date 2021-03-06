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
   analytics.data.ga.get({
        'auth': jwtClient,
        'ids': VIEW_ID,
        'metrics': 'ga:uniqueEvents',
        'dimensions': 'ga:eventCategory,ga:eventAction,ga:date',
        'start-date': '2016-06-20',
        'end-date': '2016-06-26',
        'filters': 'ga:eventAction=~attend_live'    
    }, function (err, response) {
        if (err) {
            console.log(err);
            return;
        }
        
        var live = response.rows.map(function(element){
            var Obj = {};
            element[0] = element[0].replace(/,group_id/,", group_id:");
            Obj["eventCategory"] = element[0];
            Obj["eventAction"] = element[1];
            Obj["date"] = element[2];
            Obj["uniqueEvents"] = element[3];
            return Obj;
        });

        var livebydate = d3.nest()
        .key(function(d) {return d.date;})
        .entries(live);
    

        var databylecture = d3.nest()
        .key(function(d) { return d.eventCategory; })
        .rollup(function(v) { return {
            system: v.length,
            total: d3.sum(v,function(d) {return d.count;})
            }; })
        .entries(livebydate);

        console.log(databylecture);

        var vailddatabylecture = databylecture.filter(function(d) { return d.values.total > 3; });

        var lectures = vailddatabylecture.length;
        var views = d3.sum(vailddatabylecture, function(d) {
            return d.values.total;
        });

        
        console.log("The total number of lectures with action 'attend_live': "+ lectures);
        console.log("The avg number of users by lectures with action 'attend_live': " + math.round(views/lectures));
        
        
        
        
    });
} 


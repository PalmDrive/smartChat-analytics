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
   analytics.data.ga.get({
        'auth': jwtClient,
        'ids': VIEW_ID,
        'metrics': 'ga:uniqueEvents',
        'dimensions': 'ga:eventCategory,ga:eventAction',
        'start-date': '2016-04-01',
        'end-date': 'yesterday',
        'sort': '-ga:uniqueEvents',
        'max-results': 1000, 
        'filters': 'ga:eventAction=~^attend_live$'    
    }, function (err, response) {
        if (err) {
            console.log(err);
            return;
        }
        var data = response.rows.map(function(element){
            var Obj = {};
            element[0] = element[0].replace(/,group_id/,", group_id:");
            Obj["eventCategory"] = element[0];
            Obj["eventAction"] = element[1];
            Obj["count"] = element[2];
            return Obj;
        });
        

        var databylecture = d3.nest()
        .key(function(d) { return d.eventCategory; })
        .rollup(function(v) { return {
            system: v.length,
            total: d3.sum(v,function(d) {return d.count;})
            }; })
        .entries(data);

        var attend_live = databylecture.map(function(element){
            var Obj = [];
            Obj[0] = element.key.toString();
            Obj[1] = 'attend_live:' + element.value.total.toString()+'\n';
            return Obj;
        });

        console.log(attend_live);
        

        fs.writeFile('attend_live.txt', attend_live, function(err) {
            if (err) {
            return console.error(err);
            }
            console.log("数据写入成功！");
        });
    });
} 



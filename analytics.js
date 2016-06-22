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
    queryUsers(analytics);
});

function queryUsers(analytics) {
   analytics.data.ga.get({
        'auth': jwtClient,
        'ids': VIEW_ID,
        'metrics': 'ga:users',
        'dimensions': 'ga:date',
        'start-date': '7daysAgo',
        'end-date': 'yesterday',
        'sort': '-ga:date',
        'max-results': 1000,        
    }, function (err, response) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('The average active users for last week is ' + math.mean(response.rows,0)[1]);
        

    });  
}







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
   queryUsers_month(analytics);
});



function queryUsers_month(analytics) {
   analytics.data.ga.get({
        'auth': jwtClient,
        'ids': VIEW_ID,
        'metrics': 'ga:users',
        'dimensions': 'ga:date',
        'start-date': '28daysAgo',
        'end-date': 'yesterday',
        'sort': '-ga:date',
        'max-results': 1000,        
    }, function (err, response) {
        if (err) {
            console.log(err);
            return;
        }
        var data = [response.rows.slice(0,7),
        response.rows.slice(7,14),response.rows.slice(14,21),response.rows.slice(21)]; 
        console.log('The weekly average active users for last month: ');
        data.forEach(get_mean);
    });
} 

function get_mean(element,index,array){
    index = (element[0][0] +' to ' + element[6][0] + ': ').toString();
    console.log(index + math.round(math.mean(element,0)[1]));
}
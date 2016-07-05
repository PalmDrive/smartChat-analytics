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
    queryusers(analytics);
});


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


function queryusers(analytics) {
	ask("Please input the start date: ", /[0-9]{4}-[0-9]{2}-[0-9]{2}|today|yesterday|[0-9]+(daysAgo)/, function(startdate) {
		ask("Please input the end date: ", /[0-9]{4}-[0-9]{2}-[0-9]{2}|today|yesterday|[0-9]+(daysAgo)/, function(enddate) {
			analytics.data.ga.get({
        		'auth': jwtClient,
        		'ids': VIEW_ID,
        		'metrics': 'ga:users',
        		'dimensions': 'ga:date',
        		'start-date': startdate,
        		'end-date': enddate,
        		'sort': 'ga:date',
        		'max-results': 1000,        
    		}, function (err, response) {
        		if (err) {
            		console.log(err);
            		return;
        		}	
        		console.log('Avg number of active users: ' + math.round(math.mean(response.rows,0)[1]));


                analytics.data.ga.get({
                    'auth': jwtClient,
                    'ids': VIEW_ID,
                    'metrics': 'ga:users, ga:sessionDuration',
                    'dimensions': 'ga:date',
                    'start-date': startdate,
                    'end-date': enddate,
                    'sort': 'ga:date',
                    'max-results': 1000,        
                }, function (err, response) {
                    if (err) {
                    console.log(err);
                    return;
                    }

                    var avgduration = math.mean(response.rows.map(function(d) {return d[2]/d[1]; }));
                    var minutes = Math.floor(avgduration / 60);
                    var seconds = math.round(avgduration - minutes * 60);

                    console.log("The average users' duration is " + minutes + " : "+ seconds);
                    
                    process.exit();
        
        

                });  
        		
        		
        	});
        });

    });  
}



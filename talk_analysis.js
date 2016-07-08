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
        	ask("Please input the date range: ", /.+/, function(range){
        		var d = new Date(livedate); //live date
        		console.log(d);
            	d.setDate(d.getDate() + Number(range)); //end date
            	var enddate = d.toJSON().substring(0,10);
            	console.log(enddate);

            	var today = new Date(); //validate
            	if (today.getTime() < d.getTime()) {
                	console.log("NO ENOUGH DAYS");
                	process.exit();
            	}

            	analytics.data.ga.get({ // #users who attended live
                    'auth': jwtClient,
                    'ids': VIEW_ID,
                    'metrics': 'ga:uniqueEvents',
                    'dimensions': 'ga:eventCategory,ga:eventAction',
                    'start-date': livedate,
                    'end-date': 'yesterday',
                    'sort': '-ga:uniqueEvents',
                    'max-results': 1000, 
                    'filters': 'ga:eventAction=~^attend_live$'    
                }, function (err, response) {
                    if (err) {
                        console.log("No Attend_live");
                        return;
                    }

                    var live = response.rows.filter(function(value){
                        return value[0].indexOf(id)> -1;
                    });
                    
                    var attendmod = live.map(function(element){
                        var Obj = {};
                        element[0] = element[0].replace(/,group_id/,", group_id:");
                        Obj["eventCategory"] = element[0];
                        Obj["count"] = element[2];
                        return Obj;
                    });
                    var livebylecture = d3.nest()
                    .key(function(d) { return d.eventCategory; })
                    .rollup(function(v) { return {
                        total: d3.sum(v,function(d) {return d.count;})
                    }; })
                    .entries(attendmod);

                    // output
                    console.log("参与直播人数： ");
                    console.log(livebylecture);

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
                		console.log("No Play_Audio");
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

                		console.log("这段时间内收听录播人数：");
                		console.log(audiobylecture);


                		analytics.data.ga.get({
                        	'auth': jwtClient,
                        	'ids': VIEW_ID,
                        	'metrics': 'ga:uniqueEvents,ga:eventValue',
                        	'dimensions': 'ga:eventCategory,ga:eventAction',
                        	'start-date': livedate,
                        	'end-date': enddate,
                        	'sort': '-ga:uniqueEvents',
                        	'max-results': 1000, 
                        	'filters': 'ga:eventAction=~^send_listen_duration:live_talk$'    
                    	}, function (err, response) {
                        	if (err) {
                            	console.log(err);
                            	return;
                        	}

                        	var livetime = response.rows.filter(function(value){
                            return value[0].indexOf(id)> -1;
                        	});

                            var avglivetime = livetime[0][3]/livetime[0][2];

                            var minutes = Math.floor(avglivetime  / 60);
                            var seconds = Math.round(avglivetime  - minutes * 60);

                            console.log("收听直播平均时间: " + minutes + " : "+ seconds);

                        	analytics.data.ga.get({
                        		'auth': jwtClient,
                        		'ids': VIEW_ID,
                        		'metrics': 'ga:uniqueEvents,ga:eventValue',
                        		'dimensions': 'ga:eventCategory,ga:eventAction',
                        		'start-date': livedate,
                        		'end-date': enddate,
                        		'sort': '-ga:uniqueEvents',
                        		'max-results': 1000, 
                        		'filters': 'ga:eventAction=~^send_listen_duration:record_talk$'    
                    		}, function (err, response) {
                        		if (err) {
                            		console.log(err);
                            		return;
                        		}

                        		var recordtime = response.rows.filter(function(value){
                            	return value[0].indexOf(id)> -1;
                        		});


                                var avgrecordtime = recordtime[0][3]/recordtime[0][2];

                                var minutes = Math.floor(avgrecordtime  / 60);
                                var seconds = Math.round(avgrecordtime  - minutes * 60);

                                console.log("收听录播平均时间: " + minutes + " : "+ seconds);


            
                        		process.exit();
                        	});
                        });
					});
                });
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

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

var result = [];

function queryusers(analytics) {
    ask("Please input the start date: ", /[0-9]{4}-[0-9]{2}-[0-9]{2}|today|yesterday|[0-9]+(daysAgo)/, function(startdate) {
        ask("Please input the end date: ", /[0-9]{4}-[0-9]{2}-[0-9]{2}|today|yesterday|[0-9]+(daysAgo)/, function(enddate) {
            analytics.data.ga.get({
                'auth': jwtClient,
                'ids': VIEW_ID,
                'metrics': 'ga:users,ga:sessionDuration',
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
                // 平均日活  
                var users = response.rows.map(function(d) {return d[1];});

                result[0] = '平均日活: ' + Math.round(math.mean(users));

                var avgduration = math.mean(response.rows.map(function(d) {return d[2]/d[1];}));
                var minutes = Math.floor(avgduration / 60);
                var seconds = Math.round(avgduration - minutes * 60);

                result[2] =  "活跃用户平均每日活跃时间: " + minutes + ":"+ seconds;

                analytics.data.ga.get({
                    'auth': jwtClient,
                    'ids': VIEW_ID,
                    'metrics': 'ga:sessions,ga:users',
                    'start-date': startdate,
                    'end-date': enddate,        
                }, function (err, response) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    
                    result[1] = "周活: " + response.rows[0][1];
                    result[10] = "访问数: " + response.rows[0][0];

                    analytics.data.ga.get({
                        'auth': jwtClient,
                        'ids': VIEW_ID,
                        'metrics': 'ga:uniqueEvents,ga:eventValue',
                        'dimensions': 'ga:date,ga:eventCategory,ga:eventAction,ga:operatingSystem,ga:appVersion',
                        'start-date': startdate,
                        'end-date': enddate,
                        'sort':'ga:date',
                        'filters': 'ga:eventAction=~^send_listen_duration:live_talk$'    
                    }, function (err, response) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        var live = response.rows.map(function(element){
                    		var Obj = {};
                    		Obj["date"] = element[0];
                    		Obj["eventCategory"] = element[1];
                    		Obj["system"] = element[3];
                    		Obj["version"] = element[4];
                    		Obj["uniqueEvents"] = element[5];
                    		if (element[3] == "Android" && (element[4] == '2.4.1'|| element[4] =='2.4.0')) {
                    			Obj["eventValue"] = element[6]/1000;
                    		} else {
                    			Obj["eventValue"] = element[6];
                    		}
                    		return Obj;
                		});

                        var liveusersbyday = d3.nest()
                		.key(function(d) { return d.date; })
                		.rollup(function(v) { return {
                		users: d3.sum(v,function(d) {return d.uniqueEvents;})
                		}; })
                		.entries(live);

                		var liveuser = liveusersbyday.map(function(element){
                			return element.value.users;
                		});

                		result[5] = "平均每日听live的人数: " + Math.round(math.mean(liveuser));
                	
                		var livetimebyday = d3.nest()
                		.key(function(d) { return d.date; })
                		.rollup(function(v) { return {
                		time: d3.sum(v,function(d) {return d.eventValue;})
                		}; })
                		.entries(live);

                		var livetime = livetimebyday.map(function(element){
                			return element.value.time;
                		});

                		var livetimeperuser = [];
                		var livetimeperliveuser = [];

                		for (var i = 0; i < livetime.length; i++) {
                			livetimeperuser[i] = livetime[i]/users[i];
                			livetimeperliveuser[i] = livetime[i]/liveuser[i];
                		} 

                		result[3] = "活跃用户平均每日听live的时间: "+ transtime(Math.round(math.mean(livetimeperuser)));
                		result[7] = "听了live的用户平均每日听live的时间: " +transtime(Math.round(math.mean(livetimeperliveuser)));



                		analytics.data.ga.get({
                        	'auth': jwtClient,
                        	'ids': VIEW_ID,
                        	'metrics': 'ga:uniqueEvents,ga:eventValue',
                        	'dimensions': 'ga:date,ga:eventCategory,ga:eventAction,ga:operatingSystem,ga:appVersion',
                        	'start-date': startdate,
                        	'end-date': enddate,
                        	'sort':'ga:date',
                        	'filters': 'ga:eventAction=~^send_listen_duration:record_talk$'    
                    	}, function (err, response) {
                        	if (err) {
                            	console.log(err);
                            	return;
                        	}
                        	var record = response.rows.map(function(element){
                    			var Obj = {};
                    			Obj["date"] = element[0];
                    			Obj["eventCategory"] = element[1];
                    			Obj["system"] = element[3];
                    			Obj["version"] = element[4];
                    			Obj["uniqueEvents"] = element[5];
                    			if (element[3] == "Android" && (element[4] == '2.4.1'|| element[4] =='2.4.0')) {
                    				Obj["eventValue"] = element[6]/1000;
                    			} else {
                    				Obj["eventValue"] = element[6];
                    			}
                    			return Obj;
                			});

                        	var recordusersbyday = d3.nest()
                			.key(function(d) { return d.date; })
                			.rollup(function(v) { return {
                			users: d3.sum(v,function(d) {return d.uniqueEvents;})
                			}; })
                			.entries(record);

                			var recorduser = recordusersbyday.map(function(element){
                			return element.value.users;
                			});

                			result[6] = "平均每日听record的人数: " + Math.round(math.mean(recorduser));
                	
                			var recordtimebyday = d3.nest()
                			.key(function(d) { return d.date; })
                			.rollup(function(v) { return {
                			time: d3.sum(v,function(d) {return d.eventValue;})
                			}; })
                			.entries(record);

                			var recordtime = recordtimebyday.map(function(element){
                				return element.value.time;
                			});

                			var recordtimeperuser = [];
                			var recordtimeperrecorduser = [];

                			for (var i = 0; i < recordtime.length; i++) {
                				recordtimeperuser[i] = recordtime[i]/users[i];
                				recordtimeperrecorduser[i] = recordtime[i]/recorduser[i];
                			} 

                			result[4] = "活跃用户平均每日听record的时间: "+ transtime(Math.round(math.mean(recordtimeperuser)));
                			result[8] = "听了record的用户平均每日听record的时间: " +transtime(Math.round(math.mean(recordtimeperrecorduser)));


                			

                			analytics.data.ga.get({
        						'auth': jwtClient,
        						'ids': VIEW_ID,
        						'metrics': 'ga:users,ga:newUsers',
        						'dimensions': 'ga:userType',
        						'start-date': startdate,
        						'end-date': enddate,
        
        						'max-results': 1000,        
        					}, function (err, response) {
            					if (err) {
                					console.log(err);
                					return;
            					}
            					result[9] = "回放者比例: " + Math.round(Number(response.rows[1][1])/(Number(response.rows[1][1])+Number(response.rows[0][1]))*1000)/10;
 								console.log(result);

 								process.exit();
 							});
                		});
                    });          
                });
});
});
});
}


function transtime(time) {
	var minutes = Math.floor(time/ 60);
	var seconds = Math.round(time  - minutes * 60);
	if (seconds < 10) {
        seconds = "0" + seconds;
    }
	return minutes + ":"+ seconds;
}

        
        

               
                
            

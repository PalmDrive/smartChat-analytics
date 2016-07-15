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
            	d.setDate(d.getDate() + Number(range)); //end date
            	var enddate = d.toJSON().substring(0,10);

            	var today = new Date(); //validate
            	if (today.getTime() < d.getTime()) {
                	console.log("NO ENOUGH DAYS");
                	process.exit();
                    return;
            	}

            	analytics.data.ga.get({ // #users who attended live
                    'auth': jwtClient,
                    'ids': VIEW_ID,
                    'metrics': 'ga:uniqueEvents',
                    'dimensions': 'ga:eventCategory,ga:eventAction',
                    'start-date': livedate,
                    'end-date': enddate,
                    'sort': '-ga:uniqueEvents',
                    'max-results': 1000, 
                    'filters': 'ga:eventAction=~^attend_live$'    
                }, function (err, response) {
                    if (err) {
                        console.log("No Attend_live");
                        process.exit();
                        return;
                    }

                    var live = response.rows.filter(function(value){
                        return value[0].indexOf(id)> -1 && value[0].indexOf("测试") == -1;
                    });

                    
                    var attendmod = live.map(function(element){
                        return element[2];
                    });

                    // output
                    console.log("参与直播人数： " + math.sum(attendmod));

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
                            process.exit();
                            return;
                		}

                		var audio = response.rows.filter(function(value){
                    		return value[0].indexOf(id)> -1 && value[0].indexOf("测试") == -1;
                		});

                		var audiomod = audio.map(function(element){
                    		return element[2];
                		});


                		console.log("这段时间内收听录播人数：" + math.sum(audiomod));

                        var timedate = new Date("2016-07-05");

                        if (d.getTime()  <= timedate.getTime()){
                            process.exit();
                            return;
                        }

                		analytics.data.ga.get({
                        	'auth': jwtClient,
                        	'ids': VIEW_ID,
                        	'metrics': 'ga:uniqueEvents,ga:eventValue',
                        	'dimensions': 'ga:eventCategory,ga:eventAction,ga:operatingSystem,ga:appVersion',
                        	'start-date': livedate,
                        	'end-date': enddate,
                        	'sort': '-ga:uniqueEvents',
                        	'max-results': 1000, 
                        	'filters': 'ga:eventAction=~^send_listen_duration:live_talk$'    
                    	}, function (err, response) {
                        	if (err) {
                            	console.log("No live duration data");
                                process.exit();
                                return;
                        	}

                        	var livetime = response.rows.filter(function(value){
                            return value[0].indexOf(id)> -1 && value[0].indexOf("测试") == -1;
                        	});

                            var live = livetime.map(function(element){
                                var Obj = [];
                                Obj[0] = element[0];
                                Obj[1] = Number(element[4]);
                                if (element[2] == "Android" && (element[3] == '2.4.1'|| element[3] =='2.4.0')) {
                                    Obj[2] = element[5]/1000;
                                } else {
                                    Obj[2] = Number(element[5]);
                                }
                                return Obj;
                            });

                            var livetime = live.map(function(element){
                                return element[2];
                            });

                            var liveuser = live.map(function(element){
                                return element[1];
                            });

                            console.log("收听直播平均时间: " + transtime(math.sum(livetime)/math.sum(liveuser)));

                        	analytics.data.ga.get({
                        		'auth': jwtClient,
                        		'ids': VIEW_ID,
                        		'metrics': 'ga:uniqueEvents,ga:eventValue',
                        		'dimensions': 'ga:eventCategory,ga:eventAction,ga:operatingSystem,ga:appVersion',
                        		'start-date': livedate,
                        		'end-date': enddate,
                        		'sort': '-ga:uniqueEvents',
                        		'max-results': 1000, 
                        		'filters': 'ga:eventAction=~^send_listen_duration:record_talk$'    
                    		}, function (err, response) {
                        		if (err) {
                            		console.log("No record duration data");
                                    process.exit();
                                    return;
                        		}

                        		var recordtime = response.rows.filter(function(value){
                            	return value[0].indexOf(id)> -1 && value[0].indexOf("测试") == -1;
                        		});

                                var record = recordtime.map(function(element){
                                    var Obj = [];
                                    Obj[0] = element[0];
                                    Obj[1] = Number(element[4]);
                                    if (element[2] == "Android" && (element[3] == '2.4.1'|| element[3] =='2.4.0')) {
                                        Obj[2] = element[5]/1000;
                                    } else {
                                        Obj[2] = Number(element[5]);
                                    }
                                    return Obj;
                                });

                                var recordtime = record.map(function(element){
                                    return element[2];
                                });

                                var recorduser = record.map(function(element){
                                    return element[1];
                                });

                                console.log("收听录播平均时间: " + transtime(math.sum(recordtime)/math.sum(recorduser)));





            
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

function transtime(time) {
    var minutes = Math.floor(time/ 60);
    var seconds = Math.round(time  - minutes * 60);
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return minutes + ":"+ seconds;
}

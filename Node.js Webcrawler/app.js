var Forager = require("./forager.js").Forager;
var url = require("url");

var fs = require('fs');
var log = fs.createWriteStream(Date.now()+'_log.txt', {'flags': 'a'});

var forager = new Forager();
forager.startURL = url.parse("http://spsu.edu");
forager.userAgent = "SPSU FORAGER";
var errors = 0;

forager.on("request_started", function (link){
});

forager.on("response_error", function(link, status, headers) {
	errors++;
	console.log(status + "  "+ link);

	log.write(errors + " - "+status + "  "+ link+"\r\n");

});

forager.on("request_error", function(link, err) {
	errors++;
	console.log("ERR  "+ link);
	log.write(errors+" - ERR  "+ link+"\r\n");

});

forager.on("complete", function ()
{
	console.log("forager complete");
});

forager.start();
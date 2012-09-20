var Forager = require("./forager.js").Forager;
var url = require("url");

var forager = new Forager();
forager.startURL = url.parse("http://spsu.edu");
forager.userAgent = "SPSU FORAGER";

forager.on("request_started", function (link){
	console.log(link);
});

forager.on("response_error", function(link, status, headers) {
	console.log(status + "  "+ link);
});

forager.on("request_error", function(link, err) {
	console.log("ERR  "+ link);
});

forager.on("complete", function ()
{
	console.log("forager complete");
});

forager.start();
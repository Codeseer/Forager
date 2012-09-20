var Crawler = require("./surfer").Crawler;

var crawler = new Crawler();
var scannedLinks = 0;
function successCallback(result)
{
	var resources = processResources(result.body.match(/(\shref\s?=\s?|\ssrc\s?=\s?|url\()['"]?([^"'\s>\)]+)/ig));
	resources.forEach(function (URL) {
		//default values
		var protocol = "http", host = result.host, path = "/";

		//vars we need
		var hostData = "", split;

		// Trim URL
		URL = URL.replace(/^\s+/,"").replace(/\s+$/,"");

		if (URL.match(/^http(s)?:\/\//i)) {
			// global url
			split = URL.replace(/^http(s)?:\/\//i,"").split(/\//g);
			hostData = split[0] && split[0].length ? split[0] : host;

			if (hostData.split(":").length > 0) {
				hostData = hostData.split(":");
				host = hostData[0];
			}

			if (URL.match(/^https:\/\//i)) {
				protocol = "https";
			}
			path = "/" + split.slice(1).join("/");
		} else if (URL.match(/^\//)) {
			// Absolute URL.
			path = URL;
		}
		// Replace problem entities...
		path = path.replace(/&amp;/ig,"&");

		// Ensure domain is always lower-case
		host = host.toLowerCase();
		var newLink = protocol +"://"+host+path;
		scannedLinks++;
		crawler.queue(newLink);
		console.log(newLink);
	});
}

function errorCallback(error){

}

// Clean links
function processResources(urlMatch) {
	var resources = new Array();
	if (urlMatch) {
		urlMatch.forEach(function(URL) {
			URL = URL.replace(/^(\s?href|\s?src)=['"]?/i,"").replace(/^\s*/,"");
			URL = URL.replace(/^url\(['"]*/i,"");
			URL = URL.replace(/^javascript\:[a-z0-9]+\(['"]/i,"");
			URL = URL.replace(/["'\)]$/i,"");
			URL = URL.split(/\s+/g).shift();

			if (URL.match(/^\s*#/)) {
				// Bookmark URL
				return false;
			}

			URL = URL.split("#").shift();

			if (URL.replace(/\s+/,"").length) {
				resources.push(URL);
			}	
		});
	}
	return resources;
}
function finished() {
	console.log("finished in"+process.uptime()+" seconds");
	console.log("scanned "+ scannedLinks+" URLs");
}
crawler.queue("http://spsu.edu");
console.log("started crawling");
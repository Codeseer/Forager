var http = require("http");
var https = require("https");
var EventEmitter = require("events").EventEmitter;
var url = require("url");

var ForagerQueue = require("./queue.js").ForagerQueue;

var Forager = function () {
	this.userAgent = "";
	this.maxOpenRequests = 25;
	this.queue = new ForagerQueue();
	this.interval = 50;

	var openRequests = 0;
	var forager = this;
	//an array of mime types the crawler will scan when looking for links
	//note that images and audio are not included so we wont been wasting time looing at images
	this.supportedContentTypes = [
		/^text\//i,
		/^application\/(rss)?[\+\/\-]?xml/i,
		/^application\/javascript/i,
		/^xml/i
		];
	//PRIVATE METHODS

	//scans the html/text given to it looking for any urls
	//returns an object with all the resources in it 
	//note this are unclean links so they may be relative paths or absolute paths
	function getRoughLinks(sourceString) {
		var links = {};
		//if they actually sent us a stringto process
		if(typeof sourceString == "string") {
			//get all hrefs, src, url() identifiers so it can find links in css :)
			var linksMatch = sourceString.match(/(\shref\s?=\s?|\ssrc\s?=\s?|url\()['"]?([^"'\s>\)]+)/ig);
			if(linksMatch) {
				linksMatch.forEach(function (URL) {
					URL = URL.replace(/^(\s?href|\s?src)=['"]?/i,"").replace(/^\s*/,"");
					URL = URL.replace(/^url\(['"]*/i,"");
					URL = URL.replace(/["'\)]$/i,"");
					URL = URL.split(/\s+/g).shift();
					URL = URL.split("#").shift();
					if (URL.replace(/\s+/,"").length) {
						//add the key to the HashMap with false so we know they are not cleaned yet
						links[URL] = false;
					}
				});
			}
		}
		return links;
	}

	//clean up all the rough links
	function cleanLinks(parentURL,links){
		var cleanedLinks = {};
			/*make all of those rough urls look nice a purty
			There is a posibility of 3 types of links
			Global links  = http://spsu.edu/SomePlace/
				These are easy because we just take the text as it is
			Absolute links = /Content/Images/Blue.png
				These are slightly more annoying but all we have to do is add a host to the front of them
				So it would become http://spsu.edu/Content/Images/Blue.png
			Relative links = images/blue.png
				Hardest of the 3
				We have to figure out what the path of the page this link was found in is
				then we have to append its path to its parents path
				parent path = /Conent/css/   links path = images/blue.png
				so we would get http://spsu.edu/Content/css/images/blue.png
			*/
		for(var URL in links) {
			//probably the coolest url function in Node.js
			//converts relative, absolute, and global urls to global urls based on their source
			//note if it is a global url this method wont do anything
			cleanedLinks[ url.resolve(parentURL, URL) ] = true;
		}
		return cleanedLinks;
	}

	//check if this is something we should scan
	function contentTypeSupported (contentType) {
		var supported = false;

		forager.supportedContentTypes.forEach(function(contentRegex) {
			if (contentRegex.exec(contentType)) {
				supported = true;
			}
		});

		return supported;

	}


	//make the actual request for the page
	//the link string passed to this function should be cleaned already
	function linkRequest(link) {
		
		forager.emit("request_started", link);
		var URL = url.parse(link);
		var requestOptions = {
			host: URL.host,
			port: URL.port,
			path: URL.path,
			headers: {
				"User-Agent": forager.userAgent
			}
		};
		if(URL.protocol === "http:"){
			http.get(requestOptions, processResponse).on("error", processError);
			openRequests++;
		}
		else if(URL.protocol === "https:"){
			https.get(requestOptions, processResponse).on("error", processError);
			openRequests++;
		}

		//this function just adds all the links from source text to the queue to be processed
		function queueFromSource(link,source){
			var newLinks = cleanLinks(link,getRoughLinks(source));
			for (nLink in newLinks) {
				forager.queue.add(nLink);
			}
		}

		function processResponse (res) {
			//this will let us know if we need to scan the resource for links or not
			var contentType = res.headers["content-type"];
			//if the status code is 200s which is OK process the response data
			//also 304 is special because it is not truly a redirect
			//304 means that the resource should be cached... but I dont have the time to write a cache right now
			if((res.statusCode>=200 && res.statusCode<300) || res.statusCode === 304) {
				forager.emit("response_success", link, res.statusCode, res.headers);
				
				var tmpArray = URL.host.split(".");
				var urlRootHost = tmpArray[tmpArray.length-2] + "." + tmpArray[tmpArray.length-1];
				if(contentTypeSupported(contentType) && urlRootHost === forager.startURL.host) {
					var source = "";
					res.setEncoding("utf8");
					res.on("data",function (chunk){
						source += chunk;
					});
					//once we have gotten all of the data from the server
					res.on("end",function(){
						forager.emit("response_downloaded", link, source);
						//get all the links from the source and add them to the queue
						queueFromSource(link,source);
						openRequests --;
					});
				}
			}
			//if status code is 300s(redirects)(NOT including 304) direguard the page data and add redirect target to the queue
			//also make sure that there is a target otherwise this is a bad link because it redirects to nowhere
			else if(res.statusCode>=300 && res.statusCode<400 && res.headers.location) {
				var redirectURL = url.resolve(link, res.headers.location);
				forager.queue.add(redirectURL);
				forager.emit("response_redirect", link, redirectURL, res.statusCode, res.headers);
				openRequests --;
			}
			//if the res gets this far its something above 400 which is an error
			else {
				forager.emit("response_error", link, res.statusCode, res.headers);
				openRequests --;
			}
		}

		//something went wroung with the request
		function processError(err){
			forager.emit("request_error", link, err);
			openRequests --;
		}
	}

	this.forage = function () {
		if(forager.queue.awaitSize()>0)
		{			
			var newLinks = forager.queue.getAwaiting();
			for(var newLink in newLinks) {
				forager.queue.setCompleted(newLink);
				linkRequest(newLink);
			}
		}
	}
}

Forager.prototype = new EventEmitter();

Forager.prototype.start = function() {
	this.queue.add(url.format(this.startURL));
	this.intervalID = setInterval(this.forage, this.interval);
}

Forager.prototype.stop = function() {
	if(this.intervalID)	clearInterval(this.intervalID);
}

exports.Forager = Forager;
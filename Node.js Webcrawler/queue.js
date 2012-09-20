var url = require("url");
var EventEmitter = require("events").EventEmitter;

//make a queue that holds all the urls
var ForagerQueue = function () {
	//create a new hashmap the key is the url string and the value is if the link has been checked.
	this.hashMap = {};
}

ForagerQueue.prototype = new EventEmitter();

ForagerQueue.prototype.add = function (urlString) {
	//add the url to the hash map if it has never been seen before
	if(!this.has(urlString)) {		
		this.hashMap[urlString] = false;
		this.emit("add", urlString);
	}
};

ForagerQueue.prototype.has = function (urlString) {
	return this.hashMap.hasOwnProperty(urlString);
};

//this method will return true if the url has been checked
//false if the url has not been checked
//or it will return an undefined object if the key does not exits
ForagerQueue.prototype.checkCompleted = function (urlString) {
	return this.hashMap[urlString];
};

ForagerQueue.prototype.setCompleted = function (urlString) {
	this.hashMap[urlString] = true;
	this.emit("complete", urlString);
}

//returns the number of urls that have been checked.
ForagerQueue.prototype.completedSize = function() {
	var size = 0, key;
	for(key in this.hashMap) {		
        if (this.hashMap[key] == true) size++;
	}
	return size;
}

//returns the number of urls waiting to be checked
ForagerQueue.prototype.awaitSize = function() {
	var size = 0, key;
	for(key in this.hashMap) {		
        if (this.hashMap[key] == false) size++;
	}
	return size;
}

//this is how we give the crawler stuff to crawl
//gets the first key that has not been checked and returns it
//if not more keys are left it returns null
ForagerQueue.prototype.getAwaiting = function() {
	var awaiting = {};
	for(var key in this.hashMap) {		
        if (this.hashMap[key] == false) awaiting[key] = false;
	}
	return awaiting;
}



//allows other javascript files see the ForagerQueue Class
exports.ForagerQueue = ForagerQueue;
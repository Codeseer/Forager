var url = require("url");

var link = "http://www.spsu.edu/Somewhere/Fun?stuff=12434    ";
var URL = url.parse(link);
//URL.protocol = "http:";
console.log( url.parse(link));
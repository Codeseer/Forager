// Generated by CoffeeScript 1.3.3
(function() {
  var Forager, db, errors, forager, fs, log, mongoose, url;

  Forager = require("./forager.js").Forager;

  url = require("url");

  fs = require("fs");

  mongoose = require('mongoose');

  db = mongoose.connect('mongodb://localhost/test');

  log = fs.createWriteStream(Date.now() + "_log.txt", {
    flags: "a"
  });

  forager = new Forager();

  forager.startURL = url.parse("http://spsu.edu");

  forager.userAgent = "SPSU FORAGER";

  errors = 0;

  forager.on("response_error", function(link, status, headers) {
    errors++;
    console.log(status + "  " + link);
    return log.write(errors + " - " + status + "  " + link + "\r\n");
  });

  forager.on("request_error", function(link, err) {
    errors++;
    console.log("ERR " + err + '  ' + link);
    return log.write(errors + " - ERR  " + link + "\r\n");
  });

  forager.on("response_success", function(link, status, headers) {
    return console.log(status + '  ' + link);
  });

  forager.on("complete", function() {
    return console.log("forager complete");
  });

  forager.start();

}).call(this);

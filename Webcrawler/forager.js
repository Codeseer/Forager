// Generated by CoffeeScript 1.3.3
(function() {
  var EventEmitter, Forager, ForagerQueue, http, https, url,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  http = require("http");

  https = require("https");

  url = require("url");

  EventEmitter = require("events").EventEmitter;

  ForagerQueue = require("./queue.js").ForagerQueue;

  Forager = (function(_super) {
    var cleanLinks, contentTypeSupported, forager, getRoughLinks, linkRequest, openRequests;

    __extends(Forager, _super);

    forager = null;

    function Forager(scanId) {
      this.userAgent = "";
      this.maxOpenRequests = 5;
      this.queue = new ForagerQueue(scanId);
      this.interval = 500;
      this.supportedContentTypes = [/^text\//i, /^application\/(rss)?[\+\/\-]?xml/i, /^application\/javascript/i, /^xml/i];
      forager = this;
    }

    Forager.prototype.start = function() {
      this.queue.add(url.format(this.startURL));
      this.intervalID = setInterval(this.forage, this.interval);
      return console.log('Forager started');
    };

    Forager.prototype.stop = function() {
      if (this.intervalID) {
        return clearInterval(this.intervalID);
      }
    };

    Forager.prototype.forage = function() {
      if (openRequests.length < forager.maxOpenRequests) {
        return forager.queue.awaitSize(function(err, size) {
          return forager.queue.getAwaiting(forager.maxOpenRequests - openRequests.length, function(err, newLinks) {
            return newLinks.forEach(function(newLink) {
              newLink.status = 0;
              return newLink.save(function(err) {
                if (!err) {
                  return linkRequest(newLink.url);
                }
              });
            });
          });
        });
      } else {
        return console.log('waiting for requests to finish');
      }
    };

    openRequests = [];

    getRoughLinks = function(sourceString) {
      var links, linksMatch;
      links = {};
      if (typeof sourceString === "string") {
        linksMatch = sourceString.match(/(\shref\s?=\s?|\ssrc\s?=\s?|url\()['"]?([^"'\s>\)]+)/g);
        if (linksMatch) {
          linksMatch.forEach(function(URL) {
            URL = URL.replace(/^(\s?href|\s?src)=['"]?/i, "").replace(/^\s*/, "");
            URL = URL.replace(/^url\(['"]*/i, "");
            URL = URL.replace(/["'\)]$/i, "");
            URL = URL.split(/\s+/g).shift();
            URL = URL.split("#").shift();
            if (URL.replace(/\s+/, "").length) {
              return links[URL] = false;
            }
          });
        }
      }
      return links;
    };

    cleanLinks = function(parentURL, links) {
      var URL, cleanedLinks;
      cleanedLinks = {};
      for (URL in links) {
        cleanedLinks[url.resolve(parentURL, URL)] = true;
      }
      return cleanedLinks;
    };

    contentTypeSupported = function(contentType) {
      var supported;
      supported = false;
      forager.supportedContentTypes.forEach(function(contentRegex) {
        if (contentRegex.exec(contentType)) {
          return supported = true;
        }
      });
      return supported;
    };

    linkRequest = function(link, scan) {
      var URL, finishedRequest, processError, processResponse, queueFromSource, request, requestOptions;
      finishedRequest = function(status, links) {
        forager.queue.setCompleted(link, status, links);
        return openRequests.splice(openRequests.indexOf(link, 1));
      };
      queueFromSource = function(link, source, status) {
        var nLink, newLinks;
        newLinks = cleanLinks(link, getRoughLinks(source));
        for (nLink in newLinks) {
          forager.queue.add(nLink);
        }
        return finishedRequest(status, newLinks);
      };
      processResponse = function(res) {
        var contentType, redirectURL, source, tmpArray, urlRootHost;
        contentType = res.headers["content-type"];
        if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 304) {
          if (!scan) {
            forager.emit("response_success", link, res.statusCode, res.headers);
          }
          tmpArray = URL.host.split(".");
          urlRootHost = tmpArray[tmpArray.length - 2] + "." + tmpArray[tmpArray.length - 1];
          if (contentTypeSupported(contentType) && urlRootHost === forager.startURL.host) {
            if (scan) {
              source = "";
              res.setEncoding("utf8");
              res.on("data", function(chunk) {
                return source += chunk;
              });
              return res.on("end", function() {
                forager.emit("response_downloaded", link, source);
                return queueFromSource(link, source, res.statusCode);
              });
            } else {
              return linkRequest(link, true);
            }
          } else {
            return finishedRequest(res.statusCode);
          }
        } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectURL = url.resolve(link, res.headers.location);
          forager.queue.add(redirectURL);
          forager.emit("response_redirect", link, redirectURL, res.statusCode, res.headers);
          return finishedRequest(res.statusCode);
        } else {
          forager.emit("response_error", link, res.statusCode, res.headers);
          return finishedRequest(res.statusCode);
        }
      };
      processError = function(err) {
        forager.emit("request_error", link, err);
        if (request) {
          request.abort();
        }
        return finishedRequest(1000);
      };
      if (!scan) {
        openRequests.push(link);
      }
      request = null;
      URL = url.parse(link);
      requestOptions = {
        host: URL.host,
        port: URL.port,
        path: URL.path,
        method: "HEAD",
        headers: {
          "User-Agent": forager.userAgent
        }
      };
      if (scan) {
        requestOptions.method = "GET";
      }
      if (URL.protocol === "http:") {
        request = http.get(requestOptions, processResponse);
      } else if (URL.protocol === "https:") {
        request = https.get(requestOptions, processResponse);
      }
      if (request) {
        request.setTimeout(4000, function() {
          return processError('timedOut');
        });
        request.setNoDelay(true);
        forager.emit("request_started", link);
        return request.on("error", processError);
      } else {
        return processError('Unsuported protocol');
      }
    };

    return Forager;

  })(EventEmitter);

  exports.Forager = Forager;

}).call(this);

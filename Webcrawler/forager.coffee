http = require "http"
https = require "https"
url = require "url"
EventEmitter = require("events").EventEmitter
ForagerQueue = require("./queue.js").ForagerQueue
class Forager extends EventEmitter
  forager = null
  #PUBLIC vars
  constructor: ->
    @userAgent = ""
    @maxOpenRequests = 5
    @queue = new ForagerQueue(1)
    @interval = 500
    @supportedContentTypes = [/^text\//i, /^application\/(rss)?[\+\/\-]?xml/i, /^application\/javascript/i, /^xml/i]
    forager = this
  # PUBLIC METHODS
  start: ->
    @queue.add url.format @startURL
    @intervalID = setInterval @forage, @interval
    console.log 'Forager started'
  stop: ->
    clearInterval @intervalID  if @intervalID

  forage: ->
    if openRequests.length < forager.maxOpenRequests
      forager.queue.awaitSize (err, size) ->
        forager.queue.getAwaiting forager.maxOpenRequests-openRequests.length, (err, newLinks) ->
          newLinks.forEach (newLink) ->
            #set checkout status
            newLink.status = 0
            newLink.save (err) ->
              linkRequest newLink.url if !err
    else
      console.log 'waiting for requests to finish'
  
  #PRIVATE vars  
  openRequests = []
  

  # PRIVATE METHODS
  getRoughLinks = (sourceString) ->
    links = {}
    #if they actually sent us a stringto process
    if typeof sourceString is "string"
      #get all hrefs, src, url() identifiers so it can find links in css :)
      linksMatch = sourceString.match /(\shref\s?=\s?|\ssrc\s?=\s?|url\()['"]?([^"'\s>\)]+)/g
      if linksMatch
        linksMatch.forEach (URL) ->
          URL = URL.replace(/^(\s?href|\s?src)=['"]?/i, "").replace(/^\s*/, "")
          URL = URL.replace /^url\(['"]*/i, ""
          URL = URL.replace /["'\)]$/i, ""
          URL = URL.split(/\s+/g).shift()
          URL = URL.split("#").shift()
          #add the key to the HashMap with false so we know they are not cleaned yet
          links[URL] = false if URL.replace(/\s+/, "").length
    links
  
  #clean up all the rough links
  cleanLinks = (parentURL, links) ->
    cleanedLinks = {}    
    for URL of links      
      #probably the coolest url function in Node.js
      #converts relative, absolute, and global urls to global urls based on their source
      #note if it is a global url this method wont do anything
      cleanedLinks[url.resolve(parentURL, URL)] = true
    cleanedLinks
  
  #check if this is something we should scan
  contentTypeSupported = (contentType) ->
    supported = false
    forager.supportedContentTypes.forEach (contentRegex) ->
      supported = true  if contentRegex.exec(contentType)

    supported
  
  #make the actual request for the page
  #the link string passed to this function should be cleaned already
  linkRequest = (link, scan) ->

    finishedRequest = (status, links)->      
      forager.queue.setCompleted link, status, links
      openRequests.splice openRequests.indexOf link, 1

    #this function just adds all the links from source text to the queue to be processed
    queueFromSource = (link, source, status) ->
      newLinks = cleanLinks link, getRoughLinks(source)
      for nLink of newLinks
        forager.queue.add nLink
      finishedRequest(status, newLinks)

    processResponse = (res) ->
      
      #this will let us know if we need to scan the resource for links or not
      contentType = res.headers["content-type"]      
      #if the status code is 200s which is OK process the response data
      #also 304 is special because it is not truly a redirect
      #304 means that the resource should be cached... but I dont have the time to write a cache right now
      if (res.statusCode >= 200 and res.statusCode < 300) or res.statusCode is 304
        forager.emit "response_success", link, res.statusCode, res.headers if not scan
        tmpArray = URL.host.split "."
        urlRootHost = tmpArray[tmpArray.length - 2] + "." + tmpArray[tmpArray.length - 1]
        if contentTypeSupported(contentType) and urlRootHost is forager.startURL.host
          if scan
            source = ""
            res.setEncoding "utf8"
            res.on "data", (chunk) ->
              source += chunk            
            #once we have gotten all of the data from the server
            res.on "end", ->
              forager.emit "response_downloaded", link, source              
              #get all the links from the source and add them to the queue
              queueFromSource link, source, status
              #the link has been scaned
          else
            linkRequest link, true
        else
          finishedRequest(res.statusCode)
      
      #if status code is 300s(redirects)(NOT including 304) direguard the page data and add redirect target to the queue
      #also make sure that there is a target otherwise this is a bad link because it redirects to nowhere
      else if res.statusCode >= 300 and res.statusCode < 400 and res.headers.location
        redirectURL = url.resolve(link, res.headers.location)
        forager.queue.add redirectURL
        forager.emit "response_redirect", link, redirectURL, res.statusCode, res.headers
        finishedRequest(res.statusCode)
      
      #if the res gets this far its something above 400 which is an error
      else
        forager.emit "response_error", link, res.statusCode, res.headers
        finishedRequest(res.statusCode)   
    #something went wrong with the request
    processError = (err) ->
      forager.emit "request_error", link, err
      request.abort() if request
      finishedRequest(res.statusCode)

    openRequests.push link if not scan
    request = null
    URL = url.parse(link)
    requestOptions =
      host: URL.host
      port: URL.port
      path: URL.path
      method: "HEAD"
      headers:
        "User-Agent": forager.userAgent

    requestOptions.method = "GET" if scan

    if URL.protocol is "http:"
      request = http.get requestOptions, processResponse
    else if URL.protocol is "https:"
      request = https.get requestOptions, processResponse
    if request
      request.setTimeout 4000, ->
        processError 'timedOut'
      request.setNoDelay true
      forager.emit "request_started", link
      request.on "error", processError
    else 
      processError 'Unsuported protocol'

exports.Forager = Forager
url = require "url"
EventEmitter = require("events").EventEmitter

mongoose = require "mongoose"
Schema = mongoose.Schema
ObjectId = Schema.ObjectId

QueueLinkSchema = new Schema
  scanId: Number
  url: String
  links: [String]
  status:
    type: Number
    default: -1

QueueLink = mongoose.model "QueueLink", QueueLinkSchema

#make a queue that holds all the urls
class ForagerQueue extends EventEmitter  
  #create a new hashmap the key is the url string and the value is if the link has been checked.
  sId = 0
  constructor: (id)->
    sId = id

  getLink = (urlString, cb) ->
    QueueLink.findOne(scanId: sId).where('url').equals(urlString).exec cb

  add: (urlString, cb) ->    
    #add the url to the hash map if it has never been seen before
    getLink urlString, (err, link) ->
      if !link
        newLink = new QueueLink
          url: urlString
          scanId: sId
        newLink.save cb



  #this method will return true if the url has been checked
  #false if the url has not been checked
  #or it will return an undefined object if the key does not exits
  checkCompleted: (urlString, cb) -> 
    QueueLink.findOne(scanId: sId).where('status').ne(-1).ne(0).exec cb

  setCompleted: (urlString, status, pageLinks) ->
    getLink urlString, (err, link) ->
      link.status = status
      link.links = pageLinks
      link.save (err) ->
        console.log 'could not save '+urlString if err
        @emit "complete", urlString unless err

  #returns the number of urls that have been checked.
  completedSize: (cb) ->
    QueueLink.find(scanId: sId).where('status').ne(-1).ne(0).count cb

  #returns the number of urls waiting to be checked
  awaitSize: (cb) ->
    QueueLink.find(scanId: sId).where('status').equals(-1).count cb

  #this is how we give the crawler stuff to crawl
  #gets the first key that has not been checked and returns it
  getAwaiting: (num, cb)->
    if num
      QueueLink.find(scanId: sId).where('status').equals(-1).limit(num).exec cb
    else
      QueueLink.find(scanId: sId).where('status').equals(-1).exec cb

#allows other javascript files see the ForagerQueue Class
exports.ForagerQueue = ForagerQueue
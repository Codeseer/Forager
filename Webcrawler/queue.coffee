url = require "url"
EventEmitter = require("events").EventEmitter

mongoose = require "mongoose"
Schema = mongoose.Schema
ObjectId = Schema.ObjectId

QueueItemSchema = new Schema
  scanID:
    type: ObjectId
  url:
    type: String
  links:
    type: [ObjectId]
  status:
    type: Number
    default: -1

QueueItem = mongoose.model 'QueueItem', QueueItemSchema

#make a queue that holds all the urls
class ForagerQueue extends EventEmitter  
  #create a new hashmap the key is the url string and the value is if the link has been checked.
  constructor: ->
    @hashMap = {}

  add: (urlString) ->
    
    #add the url to the hash map if it has never been seen before
    unless @has(urlString)
      @hashMap[urlString] = false
      @emit "add", urlString

  has: (urlString) ->
    @hashMap.hasOwnProperty urlString


  #this method will return true if the url has been checked
  #false if the url has not been checked
  #or it will return an undefined object if the key does not exits
  checkCompleted: (urlString) ->
    @hashMap[urlString]

  setCompleted: (urlString) ->
    @hashMap[urlString] = true
    @emit "complete", urlString


  #returns the number of urls that have been checked.
  completedSize: ->
    size = 0
    for key of @hashMap
      size++  if @hashMap[key] is true
    size


  #returns the number of urls waiting to be checked
  awaitSize: ->
    size = 0
    for key of @hashMap
      size++  if @hashMap[key] is false
    size


  #this is how we give the crawler stuff to crawl
  #gets the first key that has not been checked and returns it
  #if not more keys are left it returns null
  getAwaiting: ->
    awaiting = {}
    for key of @hashMap
      awaiting[key] = false  if @hashMap[key] is false
    awaiting

#allows other javascript files see the ForagerQueue Class
exports.ForagerQueue = ForagerQueue
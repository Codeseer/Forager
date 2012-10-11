Forager = require("./forager.js").Forager
url = require "url"
fs = require "fs"
mongoose = require 'mongoose'
db = mongoose.connect 'mongodb://localhost/test'

log = fs.createWriteStream Date.now() + "_log.txt",
  flags: "a"

forager = new Forager(123)
forager.startURL = url.parse "http://spsu.edu"
forager.userAgent = "SPSU FORAGER"

errors = 0

forager.on "response_error", (link, status, headers) ->
  errors++
  console.log status + "  " + link
  log.write errors + " - " + status + "  " + link + "\r\n"

forager.on "request_error", (link, err) ->
  errors++
  console.log "ERR "+err+'  '+ link
  log.write errors + " - ERR  " + link + "\r\n"

forager.on "response_success", (link, status, headers) ->
  console.log status+'  '+link

forager.on "complete", ->
  console.log "forager complete"

forager.start()
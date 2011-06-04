#!/usr/bin/env lua
local http = require("socket.http")
local ltn12 = require("ltn12")

local qs = os.getenv("QUERY_STRING")
if qs == nil or not qs:find("^%d+$") then
  print("Status: 403 STOP TEH HAX!111\n\n")
  os.exit(1)
end

print("Content-type: text/xml\n")

local api_key = "eba9632ddc908a8fd7ad1200d771beb7"

http.request {
  url = "http://ws.audioscrobbler.com/2.0/?method=event.getinfo&event=" .. qs .. "&api_key=" .. api_key,
  sink = ltn12.sink.file(io.stdout)
}

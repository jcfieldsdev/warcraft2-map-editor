#!/usr/bin/env python
# coding=utf-8

import cgi, json, os

mapdir="../maps/"

args=cgi.FieldStorage()
dir=args.getvalue("dir") if "dir" in args else ""

if dir.startswith("."):
	dir=""

if not dir.endswith("/"):
	dir=dir+"/"

dirs=[]
files=[]

try:
	for f in os.listdir(mapdir+dir):
		if os.path.isdir(mapdir+dir+f) and f!="templates":
			dirs.append(f)
		elif f.endswith(".pud"):
			files.append(f)
except OSError:
	pass

dirs.sort()
files.sort()

print "Content-Type: application/json; charset=utf-8\n"
print json.dumps({"dirs": dirs, "files": files})
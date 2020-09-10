#!/usr/bin/env python3

import cgi
import json
import os

root = '../maps'

args = cgi.FieldStorage()
path = args.getvalue('path') if 'path' in args else ''

if path.startswith('.'):
	path = ''

dirs = []
files = []

try:
	for f in os.listdir(os.path.join(root, path)):
		if os.path.isdir(os.path.join(root, path, f)) and f != 'templates':
			dirs.append(f)
		elif f.endswith('.pud'):
			files.append(f)
except OSError:
	pass

dirs.sort()
files.sort()

print('Content-Type: application/json; charset=utf-8\n')
print(json.dumps({'dirs': dirs, 'files': files}))
#!/bin/sh

for file in *.png; do convert $file -transparent "$1" $file; done
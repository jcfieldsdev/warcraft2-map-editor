#!/bin/sh

width=$(convert $1 -ping -format "%w" info:)
height=$(expr $2 \* $width)

convert $1 -crop ${width}x$height+0+0 $1

echo "Cropped $1 to ${width}x$height"
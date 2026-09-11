#!/bin/bash
# Turn a capture into what public/shots serves.
#
#   encode.sh still <in.png> <out-base>
#   encode.sh card  <in.png> <out-base> <x> <y>
#   encode.sh clip  <in.mov> <out-base> <start> <seconds> <poster-at>
set -euo pipefail

FRAME_WIDTH=1280
CARD_WIDTH=900

case "${1:-}" in
still)
  cwebp -quiet -q 82 -resize "$FRAME_WIDTH" 0 "$2" -o "$3.webp"
  ;;
card)
  # 1300x832 keeps a crop at the ratio the frames already have.
  ffmpeg -v error -i "$2" -vf "crop=1300:832:$4:$5" -f image2 -y "$3.crop.png"
  cwebp -quiet -q 82 -resize "$CARD_WIDTH" 0 "$3.crop.png" -o "$3.webp"
  rm -f "$3.crop.png"
  ;;
clip)
  in="$2"; base="$3"; start="$4"; seconds="$5"; poster="$6"
  ffmpeg -v error -ss "$start" -t "$seconds" -i "$in" \
    -vf "scale=$FRAME_WIDTH:-2,fps=30" -an \
    -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart \
    -y "$base.mp4"
  ffmpeg -v error -ss "$start" -t "$seconds" -i "$in" \
    -vf "scale=$FRAME_WIDTH:-2,fps=30" -an \
    -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -y "$base.webm"
  ffmpeg -v error -ss "$poster" -i "$in" -frames:v 1 \
    -vf "scale=$FRAME_WIDTH:-2" -y "$base.poster.png"
  cwebp -quiet -q 82 "$base.poster.png" -o "$base.webp"
  rm -f "$base.poster.png"
  ;;
*)
  echo "usage: encode.sh still|card|clip …" >&2
  exit 2
  ;;
esac

for file in "$3".*; do
  [ -f "$file" ] && printf '%6s KB  %s\n' "$(($(stat -f%z "$file") / 1024))" "$(basename "$file")"
done

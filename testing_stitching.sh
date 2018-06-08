#!/usr/bin/env zsh

Hour="$1"
Minute="$2"
APM="$3"
Week="$4"
Month="$5"
Day="$6"

if [[ -e ffmpeg.log ]]; then
  rm ffmpeg.log
fi

function concat() {
  local one="$1"
  local two="$2"
  local out="$3"

  if [[ -e /tmp/stitch.mp3 ]]; then
    rm /tmp/stitch.mp3
  fi

  ffmpeg -i "concat:$one|$two" -acodec copy /tmp/stitch.mp3 &>> ffmpeg.log
  mv /tmp/stitch.mp3 "$out"
}

concat "prefix.mp3"    "hour_$Hour.mp3"     "timestamp.mp3"
concat "timestamp.mp3" "minute_$Minute.mp3" "timestamp.mp3"
concat "timestamp.mp3" "$APM.mp3"           "timestamp.mp3"
concat "timestamp.mp3" "on.mp3"             "timestamp.mp3"
concat "timestamp.mp3" "week_$Week.mp3"     "timestamp.mp3"
concat "timestamp.mp3" "month_$Month.mp3"   "timestamp.mp3"
concat "timestamp.mp3" "day_$Day.mp3"       "timestamp.mp3"
concat "timestamp.mp3" "sufix.mp3"          "timestamp.mp3"


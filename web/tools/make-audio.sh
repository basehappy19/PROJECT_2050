#!/bin/bash
# Builds web/public/audio from the GDevelop version's sounds + extra CC0 / CC-BY sounds (see public/audio/CREDITS.txt).
# Sources (downloaded once): $CC0 = github.com/lavenderdotpet/CC0-Public-Domain-Sounds, $MOOD = github.com/remvze/moodist,
# $OGA = tracks from opengameart.org. Usage: bash tools/make-audio.sh
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../assets/audio"; mkdir -p "$OUT"
OLD="$HERE/../../gdevelop/assets/audio"
CC0="${CC0:-/home/claude/lavenderdotpet/cc0-public-domain-sounds}"
MOOD="${MOOD:-/home/claude/moodist/public/sounds}"
OGA="${OGA:-/home/claude/oga}"
KI="$CC0/kenney_interfacesounds/Audio"; KU="$CC0/kenney_uiaudio/Audio"; KR="$CC0/kenney_rpgaudio/Audio"; KS="$CC0/sci-fi-sounds/Audio"; KD="$CC0/kenney_digitalaudio/Audio"; KJ="$CC0/kenney_musicjingles/Audio"

# the GDevelop version's sounds as they are
cp "$OLD"/sfx-*.mp3 "$OLD"/amb-*.mp3 "$OUT"/
cp "$OLD"/music-*.mp3 "$OUT"/

sfx(){ # name source [gain dB] [max seconds]
  ffmpeg -v error -y -i "$2" -vn -map_metadata -1 -t "${4:-6}" -af "volume=${3:-0}dB" -ac 1 -ar 44100 -b:a 96k "$OUT/sfx-$1.mp3"
}
sfx hover    "$KU/rollover2.ogg" -8
sfx tab      "$KI/switch_002.ogg" -2
sfx toggle   "$KI/toggle_002.ogg" -2
sfx tick     "$KI/tick_002.ogg" -6
sfx type     "$KI/tick_004.ogg" -14
sfx page     "$KR/bookFlip2.ogg" -2
sfx page2    "$KR/bookFlip1.ogg" -2
sfx coin     "$KR/handleCoins.ogg" 0
sfx coin2    "$KR/handleCoins2.ogg" 0
sfx unlock   "$KI/glass_002.ogg" 0
sfx confirm  "$KI/confirmation_002.ogg" 0
sfx skillsOpen  "$KI/maximize_003.ogg" 0
sfx skillsClose "$KI/minimize_003.ogg" 0
sfx question "$KI/question_002.ogg" 0
sfx glitch   "$KI/glitch_002.ogg" -3
sfx bong     "$KI/bong_001.ogg" -2
sfx pluck    "$KI/pluck_001.ogg" -2
sfx drop     "$KI/drop_002.ogg" -2
sfx impact   "$KS/lowFrequency_explosion_000.ogg" 2 4
sfx shield   "$KS/forceField_001.ogg" -4
sfx whoosh   "$KS/doorOpen_001.ogg" -2
sfx data     "$KS/computerNoise_000.ogg" -8 2
sfx bell     "$CC0/kenney_impactsounds/Audio/impactBell_heavy_000.ogg" -4
sfx relUp    "$KD/highUp.ogg" -10
sfx relDown  "$KD/lowDown.ogg" -10
sfx powerup  "$KD/powerUp2.ogg" -10
sfx levelup  "$KJ/Steel jingles/jingles_STEEL16.ogg" -2
sfx fanfare  "$KJ/Pizzicato jingles/jingles_PIZZI00.ogg" -2
sfx jingle   "$KJ/Steel jingles/jingles_STEEL00.ogg" -2
sfx sax      "$KJ/Sax jingles/jingles_SAX10.ogg" -2
# one-shot thunder clap cut from the Moodist thunder recording (loudest second)
ffmpeg -v error -y -ss 6 -i "$MOOD/rain/thunder.mp3" -vn -map_metadata -1 -t 5 -af "afade=t=in:d=0.05,afade=t=out:st=3.8:d=1.2,volume=2dB" -ac 1 -b:a 96k "$OUT/sfx-thunder.mp3"

amb(){ # name source [gain dB] [seconds]  → a looping ambience (fade at both ends so the loop seam is soft)
  local d="${4:-40}"
  ffmpeg -v error -y -i "$2" -vn -map_metadata -1 -t "$d" -af "loudnorm=I=-24:TP=-3:LRA=11,volume=${3:-0}dB,afade=t=in:d=0.6,afade=t=out:st=$(echo "$d - 0.6" | bc):d=0.6" -ac 2 -ar 44100 -b:a 96k "$OUT/amb-$1.mp3"
}
amb thunder  "$MOOD/rain/thunder.mp3" 0 40
amb rain     "$MOOD/rain/heavy-rain.mp3" 0 30
amb gale     "$MOOD/nature/howling-wind.mp3" 0 30
amb campfire "$MOOD/nature/campfire.mp3" 0 40
amb night    "$MOOD/animals/crickets.mp3" 0 40
amb gulls    "$MOOD/animals/seagulls.mp3" 0 30
amb jungle   "$MOOD/nature/jungle.mp3" 0 40
amb river    "$MOOD/nature/river.mp3" 0 40
amb fireworks "$MOOD/urban/fireworks.mp3" 0 30
amb keyboard "$MOOD/things/keyboard.mp3" -4 20
amb radio    "$MOOD/things/tuning-radio.mp3" -4 30
amb clock    "$MOOD/things/clock.mp3" 0 10
amb chimes   "$MOOD/things/wind-chimes.mp3" -2 40
amb bowl     "$MOOD/things/singing-bowl.mp3" 0 30
amb street   "$MOOD/urban/busy-street.mp3" 0 40
amb highway  "$MOOD/urban/highway.mp3" 0 40
amb crows    "$MOOD/animals/crows.mp3" 0 30
amb boil     "$MOOD/things/boiling-water.mp3" -2 30
amb temple   "$MOOD/places/temple.mp3" 0 40
amb morse    "$MOOD/things/morse-code.mp3" -6 15
amb space    "$CC0/50-cc0-sci-fi-sfx/loop_ambient_01.ogg" 2 60
amb hum      "$CC0/100-cc0-sfx-2/sfx100v2_loop_ambient_01.ogg" 0 60

mus(){ # name source [max seconds]
  local d="${3:-600}"
  ffmpeg -v error -y -i "$2" -vn -map_metadata -1 -t "$d" -af "loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:d=1.5,afade=t=out:st=$(echo "$d - 4" | bc):d=4" -ac 2 -ar 44100 -b:a 96k "$OUT/music-$1.mp3"
}
mus field     "$OGA/the-field-of-dreams.mp3" 84
mus soliloquy "$OGA/soliloquy.mp3" 224
mus snow      "$OGA/november-snow.mp3" 200
mus eye       "$OGA/eye-of-the-storm.mp3" 46
mus city      "$OGA/emptycity-background-music.ogg" 100
mus decision  "$OGA/decision.mp3" 234
mus machine   "$OGA/heart-of-machine.mp3" 232
mus omens     "$OGA/omens.mp3" 132
mus pursuit   "$OGA/tactical-pursuit.mp3" 130
mus descent   "$OGA/dark-descent.mp3" 83
mus lastmin   "$OGA/last-minute.mp3" 88
mus rise      "$OGA/rise-of-spirit.mp3" 82
mus demise    "$OGA/heroic-demise-updated-version.mp3" 150
mus bleeding  "$OGA/bleeding-out.ogg" 159
ls "$OUT" | wc -l; du -sh "$OUT"

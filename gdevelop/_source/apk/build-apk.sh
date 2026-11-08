#!/usr/bin/env bash
# Builds an Android APK of the GDevelop version (Project Zero) without Android Studio:
#   cd gdevelop/_source/build && node make-project.mjs --export      (makes build/export/)
#   bash ../apk/build-apk.sh [version]                                  (makes gdevelop/ProjectZero-<version>.apk)
# Needs: Java 17+ (javac + java), curl, zip, python3. Downloads apktool, dex2jar (for dx) and uber-apk-signer once into apk/.tools/.
# The app is a full-screen WebView (see java/) that serves the HTML5 export from its assets at https://appassets.androidplatform.net/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; GD="$(cd "$HERE/../.." && pwd)"
VER="${1:-2.0.0}"; CODE="$(echo "$VER" | awk -F. '{print $1*10000 + $2*100 + $3}')"
EXPORT="$GD/_source/build/export"; OUT="$GD/ProjectZero-$VER.apk"
API="${P2050_API:-https://project-zero.basehappy19.site/api}"
T="$HERE/.tools"; W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
[ -f "$EXPORT/index.html" ] || { echo "no export: run node make-project.mjs --export first"; exit 1; }
mkdir -p "$T"
[ -f "$T/apktool.jar" ] || curl -sSL -o "$T/apktool.jar" https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar
[ -f "$T/signer.jar" ] || curl -sSL -o "$T/signer.jar" https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar
[ -f "$T/dx.jar" ] || { curl -sSL -o "$W/d2j.zip" https://github.com/pxb1988/dex2jar/releases/download/v2.4/dex-tools-v2.4.zip; unzip -q -j "$W/d2j.zip" "dex-tools-v2.4/lib/dx-30.0.2.jar" -d "$W"; mv "$W/dx-30.0.2.jar" "$T/dx.jar"; }

echo "1/4 code"
mkdir -p "$W/stubcls" "$W/cls"
javac -nowarn --release 8 -d "$W/stubcls" $(find "$HERE/stubs" -name "*.java")
javac -nowarn --release 8 -cp "$W/stubcls" -d "$W/cls" "$HERE"/java/com/projectzero/game/*.java
java -cp "$T/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=24 --output="$W/classes.dex" "$W/cls"

echo "2/4 resources + game files"
P="$W/app"; mkdir -p "$P/assets/www" "$P/res"
cp -r "$EXPORT/." "$P/assets/www/"
python3 - "$P/assets/www/index.html" "$API" <<'PY'
import sys; f, api = sys.argv[1], sys.argv[2]
s = open(f, encoding="utf-8").read()
tag = '<script>window.P2050_API=%r;window.P2050_APP="android";</script>' % api
s = s.replace("<head>", "<head>" + tag, 1) if "P2050_API" not in s else s
open(f, "w", encoding="utf-8").write(s)
PY
python3 - "$GD/assets/ui/logo.png" "$P/res" <<'PY'
import sys, os
from PIL import Image
src, res = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
for d, s in {"mdpi":48, "hdpi":72, "xhdpi":96, "xxhdpi":144, "xxxhdpi":192}.items():
    os.makedirs(f"{res}/mipmap-{d}", exist_ok=True)
    bg = Image.new("RGBA", (s, s), (5, 11, 16, 255)); ic = im.resize((int(s * .86), int(s * .86)), Image.LANCZOS)
    bg.alpha_composite(ic, ((s - ic.width) // 2, (s - ic.height) // 2)); bg.save(f"{res}/mipmap-{d}/ic_launcher.png")
PY
cat > "$P/AndroidManifest.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.projectzero.game" android:versionCode="$CODE" android:versionName="$VER">
  <uses-permission android:name="android.permission.INTERNET"/>
  <application android:label="Project Zero" android:icon="@mipmap/ic_launcher" android:hardwareAccelerated="true" android:largeHeap="true" android:allowBackup="true">
    <activity android:name=".MainActivity" android:exported="true" android:screenOrientation="sensorLandscape"
      android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout|keyboard|keyboardHidden|navigation|uiMode"
      android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen" android:launchMode="singleTask">
      <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>
    </activity>
  </application>
</manifest>
XML
cat > "$P/apktool.yml" <<YML
version: 2.10.0
apkFileName: app.apk
isFrameworkApk: false
usesFramework:
  ids:
  - 1
sdkInfo:
  minSdkVersion: 24
  targetSdkVersion: 34
packageInfo:
  forcedPackageId: 127
versionInfo:
  versionCode: $CODE
  versionName: $VER
doNotCompress:
- mp3
- png
- jpg
- webp
- ttf
YML

echo "3/4 package"
java -jar "$T/apktool.jar" b "$P" -o "$W/unsigned.apk" --use-aapt2 -f >/dev/null
(cd "$W" && zip -q -0 unsigned.apk classes.dex)

echo "4/4 sign"
java -jar "$T/signer.jar" -a "$W/unsigned.apk" -o "$W/signed" ${P2050_KEYSTORE:+--ks "$P2050_KEYSTORE" --ksAlias "${P2050_KS_ALIAS:-projectzero}"} >/dev/null
cp "$(ls "$W"/signed/*.apk | head -1)" "$OUT"
echo "done: $OUT ($(du -h "$OUT" | cut -f1))"

package com.projectzero.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

/* Project Zero for Android: one full-screen WebView that runs the GDevelop HTML5 export from the app's assets.
   Files are served from https://appassets.androidplatform.net/ (see AssetClient) so the game runs like on a website. */
public class MainActivity extends Activity {
  private WebView web;

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setFlags(0x400, 0x400);   // FLAG_FULLSCREEN
    getWindow().addFlags(0x80);           // FLAG_KEEP_SCREEN_ON
    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    web.setWebViewClient(new AssetClient(this));
    web.setBackgroundColor(0xff050b10);
    setContentView(web);
    hideBars();
    web.loadUrl("https://appassets.androidplatform.net/index.html");
  }
  @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) hideBars(); }
  private void hideBars() { getWindow().getDecorView().setSystemUiVisibility(0x1706); }   // immersive sticky, no status / navigation bar
  @Override protected void onPause() { super.onPause(); if (web != null) web.onPause(); }
  @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
  /* the Back button acts like Esc in the game (closes windows, opens the pause menu) */
  @Override public void onBackPressed() {
    web.evaluateJavascript("(function(){var o={key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true};document.dispatchEvent(new KeyboardEvent('keydown',o));setTimeout(function(){document.dispatchEvent(new KeyboardEvent('keyup',o));},80);})()", null);
  }
}

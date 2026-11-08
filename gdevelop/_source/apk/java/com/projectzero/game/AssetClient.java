package com.projectzero.game;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.IOException;
import java.io.InputStream;

/* serves assets/www/* at https://appassets.androidplatform.net/* (same idea as androidx WebViewAssetLoader) */
public class AssetClient extends WebViewClient {
  private static final String HOST = "appassets.androidplatform.net";
  private final Context ctx;
  public AssetClient(Context c) { ctx = c; }

  @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
    Uri u = req.getUrl();
    if (u == null || !HOST.equals(u.getHost())) return null;
    String p = u.getPath();
    if (p == null || p.length() == 0 || p.equals("/")) p = "/index.html";
    try {
      InputStream in = ctx.getAssets().open("www" + p);
      return new WebResourceResponse(mime(p), null, in);
    } catch (IOException e) {
      return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", null, null);
    }
  }
  static String mime(String p) {
    String s = p.toLowerCase();
    if (s.endsWith(".html")) return "text/html";
    if (s.endsWith(".js")) return "application/javascript";
    if (s.endsWith(".json")) return "application/json";
    if (s.endsWith(".css")) return "text/css";
    if (s.endsWith(".png")) return "image/png";
    if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
    if (s.endsWith(".webp")) return "image/webp";
    if (s.endsWith(".svg")) return "image/svg+xml";
    if (s.endsWith(".mp3")) return "audio/mpeg";
    if (s.endsWith(".ogg")) return "audio/ogg";
    if (s.endsWith(".wav")) return "audio/wav";
    if (s.endsWith(".ttf")) return "font/ttf";
    if (s.endsWith(".woff2")) return "font/woff2";
    if (s.endsWith(".wasm")) return "application/wasm";
    if (s.endsWith(".glb")) return "model/gltf-binary";
    return "application/octet-stream";
  }
}

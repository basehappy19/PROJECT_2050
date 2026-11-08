package android.webkit; public class WebView extends android.view.ViewGroup { public WebView(android.content.Context c){}
  public WebSettings getSettings(){ return null; } public void setWebViewClient(WebViewClient c){} public void loadUrl(String u){}
  public void onPause(){} public void onResume(){} public void evaluateJavascript(String s, ValueCallback<String> cb){} }

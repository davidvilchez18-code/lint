package com.fusionapop.juego;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public final class MainActivity extends Activity {
 private WebView game;
 @Override protected void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  getWindow().setStatusBarColor(Color.rgb(123,141,189));
  getWindow().setNavigationBarColor(Color.rgb(184,139,104));
  getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  FrameLayout container=new FrameLayout(this);
  container.setBackgroundColor(Color.rgb(128,150,198));
  game=new WebView(this);
  game.setBackgroundColor(Color.rgb(128,150,198));
  game.setOverScrollMode(View.OVER_SCROLL_NEVER);
  game.setVerticalScrollBarEnabled(false);
  game.setHorizontalScrollBarEnabled(false);
  game.setWebViewClient(new WebViewClient());
  game.setWebChromeClient(new WebChromeClient());
  WebSettings settings=game.getSettings();
  settings.setJavaScriptEnabled(true);
  settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(true);
  settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);
  settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setBuiltInZoomControls(false);
  settings.setDisplayZoomControls(false);
  settings.setSupportZoom(false);
  container.addView(game,new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT));
  setContentView(container);
  game.loadUrl("file:///android_asset/index.html");
 }
 @Override protected void onPause() {
  if(game!=null){game.onPause();game.pauseTimers();}
  super.onPause();
 }
 @Override protected void onResume(){
  super.onResume();
  if(game!=null){game.onResume();game.resumeTimers();}
 }
 @Override @SuppressWarnings("deprecation") public void onBackPressed(){
  new AlertDialog.Builder(this).setTitle("¿Salir de Fusiona Pop?")
  .setMessage("Tu nivel y tu partida se guardan automáticamente en este dispositivo.")
  .setNegativeButton("Seguir jugando",(dialog,which)->dialog.dismiss())
  .setPositiveButton("Salir",(dialog,which)->finish()).show();
 }
 @Override protected void onDestroy(){
  if(game!=null){game.stopLoading();game.destroy();game=null;}
  super.onDestroy();
 }
}

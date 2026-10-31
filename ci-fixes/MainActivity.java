package com.ankurdryice.events;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor must know this plugin before the bridge is initialized.
        registerPlugin(FirebaseAuthenticationPlugin.class);
        Log.i("AnkurAuth", "Registering FirebaseAuthenticationPlugin before bridge initialization");
        super.onCreate(savedInstanceState);
        if (getBridge() != null) {
            getBridge().getWebView().getSettings().setSupportZoom(false);
            getBridge().getWebView().getSettings().setBuiltInZoomControls(false);
            getBridge().getWebView().getSettings().setDisplayZoomControls(false);
            Log.i("AnkurAuth", "Capacitor bridge initialized");
        } else {
            Log.e("AnkurAuth", "Capacitor bridge is null after onCreate");
        }
    }
}

/**
 * PAISA Native App
 *
 * WebView wrapper that loads the Paisa PWA + adds native features:
 * - Push notifications (reminders to log expenses)
 * - Back button handling
 * - Splash screen
 * - Native status bar
 *
 * SMS reading requires a custom native module (see README for setup).
 * The WebView bridge is ready to receive SMS data.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  BackHandler,
  AppState,
  Platform,
  type AppStateStatus,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const PAISA_URL = "https://exptracker-chi.vercel.app";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Push Notifications ───
  useEffect(() => {
    registerForNotifications();
    scheduleReminders();
  }, []);

  async function registerForNotifications() {
    if (!Device.isDevice) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  }

  async function scheduleReminders() {
    // Cancel existing
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Afternoon reminder — 1:30 PM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Paisa 💸",
        body: "Had lunch? Track it before you forget!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 13,
        minute: 30,
      },
    });

    // Evening reminder — 8:30 PM daily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Paisa 💸",
        body: "End of day — log your expenses!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 30,
      },
    });

    // Night fact — 10 PM daily
    const facts = [
      "☕ ₹100/day chai = ₹36,500/year",
      "🍔 Cooking > ordering. Save 60%",
      "📱 Check your subscriptions this month",
      "💰 People who track expenses save 15-20% more",
      "🚌 Metro > cab. Save ₹5K/month",
    ];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Paisa 💡",
        body: facts[new Date().getDay() % facts.length],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 22,
        minute: 0,
      },
    });
  }

  // ─── Handle back button ───
  useEffect(() => {
    const handler = () => {
      if (canGoBack && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [canGoBack]);

  // ─── Handle messages from WebView ───
  const onWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "REQUEST_SMS_SYNC") {
        // SMS sync would go here with native module
        console.log("[Paisa] SMS sync requested from web");
      }
    } catch {
      // Not JSON, ignore
    }
  }, []);

  // JavaScript injected into WebView — marks this as native app
  const injectedJS = `
    (function() {
      window.__paisaNative = {
        isNativeApp: true,
        platform: '${Platform.OS}',
        requestSMSSync: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'REQUEST_SMS_SYNC' }));
        },
      };
      // Override the browser notification API since we use native notifications
      window.__nativeNotifications = true;
      true;
    })();
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#6366F1" barStyle="light-content" />

      {loading && (
        <View style={styles.splash}>
          <View style={styles.splashIcon}>
            <Text style={styles.splashIconText}>₹</Text>
          </View>
          <Text style={styles.splashTitle}>Paisa</Text>
          <Text style={styles.splashSub}>Your money, organized</Text>
        </View>
      )}

      <WebView
        ref={webviewRef}
        source={{ uri: PAISA_URL }}
        style={[styles.webview, loading && { opacity: 0 }]}
        injectedJavaScript={injectedJS}
        onMessage={onWebViewMessage}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowsBackForwardNavigationGestures
        startInLoadingState={false}
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        cacheEnabled
        // Handle external links
        onShouldStartLoadWithRequest={(request) => {
          // Allow WhatsApp share, Google login, and the main app
          if (
            request.url.startsWith(PAISA_URL) ||
            request.url.includes("accounts.google.com") ||
            request.url.includes("firebaseapp.com") ||
            request.url.includes("wa.me") ||
            request.url.includes("whatsapp.com")
          ) {
            return true;
          }
          return false;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  webview: {
    flex: 1,
  },
  splash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  splashIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  splashIconText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "800",
  },
  splashTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  splashSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },
});

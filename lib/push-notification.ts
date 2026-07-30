import { notificationsApi } from "@/lib/api";

/**
 * Register background service worker and register push token with backend
 */
export async function registerPushNotificationToken() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[Push Notification] Notifications not supported on this browser.");
    return null;
  }

  try {
    let permission = Notification.permission;

    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.log("[Push Notification] Permission denied by user.");
      return null;
    }

    // Register service worker
    let registration: ServiceWorkerRegistration | null = null;
    if ("serviceWorker" in navigator) {
      try {
        registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("[Push Notification] Service worker registered successfully.");
      } catch (swErr) {
        console.warn("[Push Notification] SW registration error:", swErr);
      }
    }

    // Generate or fetch pseudo/FCM Web Push token
    // If Firebase Web SDK config is provided in env, use getToken(messaging)
    // Otherwise generate a browser-specific push token string for testing
    let deviceToken = localStorage.getItem("pushDeviceToken");
    if (!deviceToken) {
      deviceToken = "web_token_" + Math.random().toString(36).substring(2, 15) + Date.now();
      localStorage.setItem("pushDeviceToken", deviceToken);
    }

    // Register token to backend
    await notificationsApi.registerToken(deviceToken, "web");
    console.log("[Push Notification] Device token registered to server.");
    return deviceToken;
  } catch (error) {
    console.error("[Push Notification] Token registration failed:", error);
    return null;
  }
}

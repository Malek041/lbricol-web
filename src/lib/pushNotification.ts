import { messaging, db, auth } from "./firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

// The new, guaranteed-valid VAPID Public Key
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BMXM4XvAashUocep0BbgS6B6_7bCjUAx93b4AbqN7MQ0vYDbzFteUrdQ6VKX9fx5YIF4q-leG_h-fU3GoOhilb0";

/**
 * Helper to convert Base64 URL to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String: string) {
    try {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (e) {
        console.error("Failed to decode VAPID key:", e);
        return null;
    }
}

export async function requestNotificationPermission() {
    if (typeof window === "undefined") return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            // Get native subscription instead of Firebase token
            const subscription = await getAndSaveNativeSubscription();
            return subscription;
        } else {
            console.warn("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return null;
    }
}

export async function getAndSaveNativeSubscription() {
    if (typeof window === "undefined" || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Check if we already have a subscription
        let subscription = await registration.pushManager.getSubscription();
        
        // If not, or if we want to ensure fresh, subscribe
        if (!subscription) {
            const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            if (!convertedVapidKey) throw new Error("Invalid VAPID format");

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        if (subscription) {
            await saveSubscriptionToUser(subscription);
            return subscription;
        }
        return null;
    } catch (error) {
        console.error("Native push subscription failed:", error);
        return null;
    }
}

// Support for old logic name for compatibility if needed elsewhere
export const getAndSaveToken = getAndSaveNativeSubscription;

async function saveSubscriptionToUser(subscription: PushSubscription) {
    const user = auth.currentUser;
    if (!user) return;

    // We store the full subscription object as a JSON string
    const subscriptionJson = JSON.stringify(subscription);

    try {
        const updates = {
            pushSubscriptions: arrayUnion(subscriptionJson),
            lastTokenSync: new Date().toISOString()
        };

        // Save to general user profile
        await updateDoc(doc(db, 'users', user.uid), updates).catch(() => {});
        // Save to specialized collections
        await updateDoc(doc(db, 'clients', user.uid), { pushSubscriptions: arrayUnion(subscriptionJson) }).catch(() => {});
        await updateDoc(doc(db, 'bricolers', user.uid), { pushSubscriptions: arrayUnion(subscriptionJson) }).catch(() => {});

        console.log("Native Push Subscription saved successfully");
    } catch (error) {
        console.error("Error saving subscription:", error);
    }
}

export function onMessageListener() {
    // For native push, foreground messages are handled by the browser 
    // or we can add a custom event listener in the main thread.
    return new Promise((resolve) => {
        // Fallback for UI that expects some listener
    });
}

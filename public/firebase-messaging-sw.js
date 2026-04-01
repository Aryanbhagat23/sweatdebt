importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBMajR3LpxZhR0KUm9XeT-ZJa_ePqywZEM",
  authDomain: "sweatdebt-3ef55.firebaseapp.com",
  projectId: "sweatdebt-3ef55",
  storageBucket: "sweatdebt-3ef55.firebasestorage.app",
  messagingSenderId: "242841715698",
  appId: "1:242841715698:web:3626e9d81621f36b06216b"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "SweatDebt ⚔️", {
    body:    body || "You have a new notification!",
    icon:    icon || "/android-chrome-192x192.png",
    badge:   "/android-chrome-192x192.png",
    vibrate: [200, 100, 200],
    data:    payload.data || {},
    actions: [
      { action:"open",    title:"Open App" },
      { action:"dismiss", title:"Dismiss"  },
    ],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type:"window", includeUncontrolled:true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
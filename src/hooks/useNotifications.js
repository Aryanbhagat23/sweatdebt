import { useEffect, useState } from "react";
import { requestNotificationPermission, onForegroundMessage } from "../firebase";

export default function useNotifications(user, showToast) {
  const [permission, setPermission] = useState(Notification?.permission || "default");

  useEffect(() => {
    if (!user) return;

    // Request permission after short delay (less intrusive)
    const timer = setTimeout(async () => {
      const token = await requestNotificationPermission(user.uid);
      if (token) setPermission("granted");
    }, 3000);

    // Listen for foreground notifications
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title && showToast) {
        showToast({ title, body, data: payload.data });
      }
    });

    return () => {
      clearTimeout(timer);
      if (unsub) unsub();
    };
  }, [user]);

  return { permission };
}
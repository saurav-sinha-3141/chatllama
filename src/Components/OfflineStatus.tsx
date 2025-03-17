import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed top-30 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow-md z-50">
      {message}
      <button
        className="ml-4 text-white font-bold cursor-pointer"
        onClick={() => setVisible(false)}
      >
        ×
      </button>
    </div>
  );
}

export default function OfflineStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (confirm("New content is available. Reload?")) {
          updateSW(true);
        }
      },
    });

    const updateOnlineStatus = () => setOffline(!navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return offline ? (
    <Toast message="You are offline. Some features may not be available." />
  ) : null;
}

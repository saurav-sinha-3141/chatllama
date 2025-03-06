import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

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
        <div className="bg-red-600 text-white text-center p-2 fixed top-0 left-0 w-full z-50">
            You are offline. Some features may not be available.
        </div>
    ) : null;
}

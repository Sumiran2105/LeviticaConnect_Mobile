import { Capacitor } from "@capacitor/core";

export const isMobileApp = () => Capacitor.isNativePlatform();
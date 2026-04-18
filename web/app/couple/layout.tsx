import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "The Dream Wedding",
  description: "Plan your wedding beautifully — The Dream Wedding",
  manifest: "/couple-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TDW",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2C2420",
};

export default function CoupleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

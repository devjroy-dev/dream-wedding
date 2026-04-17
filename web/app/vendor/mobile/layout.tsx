import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Vendor — The Dream Wedding",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAF6F0",
};

export default function VendorMobileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

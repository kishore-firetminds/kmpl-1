import "./globals.css";
import { Manrope, Sora } from "next/font/google";
import AppFooter from "@/components/AppFooter";
import AppToaster from "@/components/AppToaster";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

export const metadata = {
  title: "KMPL Season-1",
  description: "Tournament registration and management for KMPL Season-1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${sora.variable}`}>
      <body>
        {children}
        <AppToaster />
        <AppFooter />
      </body>
    </html>
  );
}

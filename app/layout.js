import "./globals.css";
import AppFooter from "@/components/AppFooter";
import AppToaster from "@/components/AppToaster";

export const metadata = {
  title: "KMPL Season-1",
  description: "Tournament registration and management for KMPL Season-1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AppToaster />
        <AppFooter />
      </body>
    </html>
  );
}

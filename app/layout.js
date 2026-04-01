import "./globals.css";

export const metadata = {
  title: "KMPL Season-1",
  description: "Tournament registration and management for KMPL Season-1"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

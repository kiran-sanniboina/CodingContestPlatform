import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coding Contest Platform",
  description: "Minimalist Coding Contest Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen w-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { bacley, spirtush } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahandar Kumar — Portfolio",
  description:
    "Mahandar Kumar — BSCS @ FAST-NUCES Karachi. Software development, AI/ML, competitive programming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bacley.variable} ${spirtush.variable} h-full antialiased`}
    >
      <body className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--color-corridor-floor)] text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}

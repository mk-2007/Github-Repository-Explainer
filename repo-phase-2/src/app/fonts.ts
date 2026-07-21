import localFont from "next/font/local";

// Display / headline face — door boards, room titles, your name at spawn.
// Personal-use license (see /mnt/user-data/uploads source) — fine for this
// non-commercial portfolio, not cleared for resale/commercial reuse.
export const bacley = localFont({
  src: "../fonts/Bacley-Demo.otf",
  variable: "--font-bacley",
  display: "swap",
});

// Accent / script face — taglines, signature-style text.
export const spirtush = localFont({
  src: "../fonts/Spirtush.otf",
  variable: "--font-spirtush",
  display: "swap",
});

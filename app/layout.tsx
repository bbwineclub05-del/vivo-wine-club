import type { Metadata } from "next";
import { Syne, Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vivo Wine Club — The Art of Fine Wine, Shared",
  description:
    "The exclusive club for wine lovers. Tastings, winery tours and access to the world's rarest and finest wines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${nunito.variable}`}
    >
      <body className="antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

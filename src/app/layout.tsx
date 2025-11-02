import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TTS-Mimosa",
  icons: {
    icon: "/TTS-Mimosa-App/favicon.png",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.className} flex h-screen overflow-hidden bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}

import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TTS-Mimosa",
  icons: {
    icon: "/favicon.ico", // ou /favicon.ico, conforme o arquivo que você tiver
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

// ./src/app/graphql/page.tsx

"use client";

import { useEffect, useState } from "react";
import Header from "./header";

export default function Graphql() {
  const [html, setHtml] = useState<string>("Carregando...");

  useEffect(() => {
    fetch("http://127.0.0.1:8001/graphql")
      .then((res) => res.text())
      .then((text) => setHtml(text))
      .catch((err) => setHtml("Erro ao carregar: " + err));
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <Header />
      </div>

      <div
        className="flex-1 overflow-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ./src/app/graphql/page.tsx

"use client";

import { useState } from "react";
import Header from "./header";

export default function Graphql() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
      </div>
    </div>
  );
}

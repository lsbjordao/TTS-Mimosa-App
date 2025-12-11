// ./src/app/graphql/page.tsx

"use client";

import Header from "./header";

export default function Graphql() {

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <Header />
      </div>
    </div>
  );
}

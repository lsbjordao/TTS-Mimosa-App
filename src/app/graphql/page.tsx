"use client";

import { useEffect } from "react";
import "graphiql/graphiql.css";
import { GraphiQL } from "graphiql";

export default function GraphqlPage() {
  return (
    <div className="w-full h-screen">
      <GraphiQL fetcher={async (params: any) => {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        return res.json();
      }} />
    </div>
  );
}

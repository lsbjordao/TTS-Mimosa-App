"use client";

import { useEffect, useState } from "react";
import { graphql, buildSchema } from "graphql";
import { GraphiQL } from "graphiql";
import "graphiql/graphiql.css";

export default function GraphqlPage() {
  const [executeQuery, setExecuteQuery] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sql.js.org/dist/sql-wasm.js";
    script.onload = init;
    document.body.appendChild(script);

    async function init() {
      // @ts-ignore
      const SQL = await window.initSqlJs({
        locateFile: (f) => `https://sql.js.org/dist/${f}`,
      });

      // Carrega o banco SQLite
      const res = await fetch("/data/MimosaDB.db");
      const buf = await res.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buf));

      // Lista de tabelas
      const result = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      if (!result.length) return;

      const tables = result[0].values.map((r: any[]) => r[0]);

      // Sanitizer para campos GraphQL
      const safe = (name: string) =>
        name.replace(/[^A-Za-z0-9_]/g, "_");

      // Cria Schema
      const typeDefs = `
        type Row { json: String! }

        type Query {
          tables: [String!]!
          ${tables.map((t) => `${safe(t)}: [Row!]!`).join("\n")}
        }
      `;

      const schema = buildSchema(typeDefs);

      // ROOT resolvers
      const root = {
        tables: () => tables,
        ...Object.fromEntries(
          tables.map((t) => [
            safe(t),
            () => {
              const q = db.exec(`SELECT rowid, * FROM "${t}"`);
              if (!q.length) return [];

              const cols = q[0].columns;

              return q[0].values.map((row: any[]) => {
                const obj: any = {};
                cols.forEach((c, i) => (obj[c] = row[i]));
                return { json: JSON.stringify(obj) };
              });
            },
          ])
        ),
      };

      const runQuery = async (params: any) => {
        return graphql({
          schema,
          source: params.query,
          variableValues: params.variables,
          rootValue: root,
        });
      };

      setExecuteQuery(() => runQuery);
    }
  }, []);

  if (!executeQuery)
    return <div>Carregando SQLite + GraphQL...</div>;

  return (
    <div className="w-full h-screen">
      <GraphiQL fetcher={executeQuery} />
    </div>
  );
}

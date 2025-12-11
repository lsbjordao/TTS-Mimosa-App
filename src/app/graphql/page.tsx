"use client";

import { useEffect, useState } from "react";
import initSqlJs from "sql.js";
import { graphql, buildSchema } from "graphql";
import { GraphiQL } from "graphiql";
import "graphiql/graphiql.css";

export default function GraphqlPage() {
  const [executeQuery, setExecuteQuery] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`,
      });

      const res = await fetch("/data/MimosaDB.db");
      const buf = await res.arrayBuffer();
      const db = new SQL.Database(new Uint8Array(buf));

      const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tables = result[0].values.map((r: any[]) => r[0]);

      const typeDefs =
        `
        type Row { json: String! }

        type Query {
          tables: [String!]!,
          ` +
        tables.map((t: string) => `${t}: [Row!]!`).join(",") +
        `
        }
      `;

      const schema = buildSchema(typeDefs);

      const root = {
        tables: () => tables,
        ...Object.fromEntries(
          tables.map((t: string) => [
            t,
            (_: any, context: any) => {
              console.log("HEADERS RECEBIDOS:", context.headers);
              const q = db.exec(`SELECT rowid, * FROM ${t}`);
              if (!q.length) return [];
              const columns = q[0].columns;
              return q[0].values.map((row: any[]) => {
                const obj: any = {};
                columns.forEach((col, i) => (obj[col] = row[i]));
                return { json: JSON.stringify(obj) };
              });
            },
          ])
        ),
      };

      // 🔥 Aqui adicionamos HEADERS dentro do contexto
      const runQuery = async (params: any) => {
        const resp = await graphql({
          schema,
          source: params.query,
          variableValues: params.variables,
          rootValue: root,
          contextValue: {
            headers: {
              "x-api-key": "123456",
              "authorization": "Bearer ABC",
              "custom-header": "Mimosa Rocks",
            },
          },
        });

        return resp;
      };

      setExecuteQuery(() => runQuery);
    }

    init();
  }, []);

  if (!executeQuery) return <div>Carregando SQLite + GraphQL...</div>;

  return (
    <div className="w-full h-screen">
      <GraphiQL fetcher={executeQuery} />
    </div>
  );
}

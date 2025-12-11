import { createSchema, createYoga } from "graphql-yoga";
import initSqlJs from "sql.js";
import { NextRequest } from "next/server";

// Carrega banco SQLite do /public/data/MimosaDB.db
let dbPromise = fetch("/data/MimosaDB.db")
  .then((res) => res.arrayBuffer())
  .then(async (buffer) => {
    const SQL = await initSqlJs({
      locateFile: (file: any) => `https://sql.js.org/dist/${file}`,
    });
    return new SQL.Database(new Uint8Array(buffer));
  });

export const { handleRequest } = createYoga<NextRequest>({
  schema: createSchema({
    typeDefs: `
      type Query {
        tables: [String!]!
      }
    `,
    resolvers: {
      Query: {
        tables: async () => {
          const db = await dbPromise;
          let result = db.exec(
            "SELECT name FROM sqlite_master WHERE type='table'"
          );
          return result[0].values.map((row: any[]) => row[0]);
        },
      },
    },
  }),

  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

export { handleRequest as GET, handleRequest as POST };

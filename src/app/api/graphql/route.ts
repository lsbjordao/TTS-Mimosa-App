import { createYoga, createSchema } from "graphql-yoga";
import { NextRequest } from "next/server";
import initSqlJs from "sql.js";

let dbPromise = fetch(new URL("../../../../public/data/MimosaDB.db", import.meta.url))
  .then((res) => res.arrayBuffer())
  .then(async (buffer) => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });
    return new SQL.Database(new Uint8Array(buffer));
  });

const yoga = createYoga<{
  req: NextRequest;
}>({
  graphqlEndpoint: "/api/graphql",

  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        tables: [String!]!
      }
    `,
    resolvers: {
      Query: {
        tables: async () => {
          const db = await dbPromise;
          const result = db.exec(
            "SELECT name FROM sqlite_master WHERE type='table'"
          );
          return result[0].values.map((row: any[]) => row[0]);
        },
      },
    },
  }),

  fetchAPI: { Response },
});

// ⚠️ Next.js exige nome GET/POST
export { yoga as GET, yoga as POST };

import { createYoga, createSchema } from "graphql-yoga";
import initSqlJs from "sql.js";
import { NextRequest } from "next/server";

async function loadDb(req: Request) {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const baseUrl = new URL(req.url).origin;
  const res = await fetch(`${baseUrl}/data/MimosaDB.db`);
  const buffer = await res.arrayBuffer();

  return new SQL.Database(new Uint8Array(buffer));
}

const yoga = createYoga<{
  req: NextRequest;
}>({
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },

  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        tables: [String!]!
      }
    `,
    resolvers: {
      Query: {
        tables: async (_root, _args, ctx) => {
          const db = await loadDb(ctx.request);
          const result = db.exec(
            "SELECT name FROM sqlite_master WHERE type='table'"
          );
          return result[0].values.map((row: any[]) => row[0]);
        },
      },
    },
  }),
});

export { yoga as GET, yoga as POST };

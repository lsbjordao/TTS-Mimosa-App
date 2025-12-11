// ./src/app/api/graphql/route.ts

import { createYoga, createSchema } from "graphql-yoga";
import initSqlJs from "sql.js";

// ---------------------------------------------
// Tipos do contexto
// ---------------------------------------------
type GraphQLContext = {
  request: Request;
};

// ---------------------------------------------
// Carregar DB SQLite a partir do /public
// ---------------------------------------------
async function loadDb(request: Request) {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const baseUrl = new URL(request.url).origin;
  const res = await fetch(`${baseUrl}/data/MimosaDB.db`);
  const buffer = await res.arrayBuffer();

  return new SQL.Database(new Uint8Array(buffer));
}

// ---------------------------------------------
// Yoga v5 — usando .fetch()
// ---------------------------------------------
const yoga = createYoga<GraphQLContext>({
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },

  context: ({ request }) => ({ request }),

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

// ---------------------------------------------
// Handlers Next.js 16
// ---------------------------------------------
export async function GET(request: Request) {
  return yoga.fetch(request);
}

export async function POST(request: Request) {
  return yoga.fetch(request);
}

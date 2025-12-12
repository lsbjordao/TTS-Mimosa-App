"use client";

import { useEffect, useState } from "react";
import { graphql, buildSchema } from "graphql";
import { GraphiQL } from "graphiql";
import "graphiql/graphiql.css";

// Inicialização do SQL.js
declare global {
  interface Window {
    initSqlJs: any;
  }
}

export default function GraphqlPage() {
  const [fetcher, setFetcher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Carrega o SQL.js
        const SQL = await window.initSqlJs({
          locateFile: (f: string) => `https://sql.js.org/dist/${f}`,
        });

        // Carrega o banco de dados
        const res = await fetch("data/MimosaDB.db");
        if (!res.ok) throw new Error("Falha ao carregar o banco de dados");
        const buf = await res.arrayBuffer();
        const db = new SQL.Database(new Uint8Array(buf));

        // Obtém as tabelas
        const tablesResult = db.exec(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        );
        
        if (!tablesResult.length) {
          throw new Error("Nenhuma tabela encontrada no banco de dados");
        }

        const tables = tablesResult[0].values.map((row: any[]) => row[0]);

        // Sanitiza nomes para GraphQL
        const safeName = (name: string) => 
          name.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[0-9]/, "_$&");

        // Constrói o schema GraphQL
        const typeDefs = `
          type JSONRow {
            rowid: Int!
            json: String!
          }

          type Query {
            tables: [String!]!
            ${tables.map((table: string) => 
              `${safeName(table)}(limit: Int, offset: Int): [JSONRow!]!`
            ).join("\n")}
          }
        `;

        const schema = buildSchema(typeDefs);

        // Resolvers
        const root = {
          tables: () => tables,
          ...Object.fromEntries(
            tables.map((table: string) => [
              safeName(table),
              ({ limit = 100, offset = 0 }: { limit?: number; offset?: number }) => {
                try {
                  // Obtém as colunas da tabela
                  const pragmaResult = db.exec(`PRAGMA table_info("${table}")`);
                  if (!pragmaResult.length) return [];
                  const columns = pragmaResult[0].values.map((col: any[]) => col[1]);

                  // Constrói a query selecionando cada coluna
                  const selectColumns = columns.map((col: string) => `"${col}"`).join(', ');
                  const query = `SELECT rowid, ${selectColumns} FROM "${table}" LIMIT ? OFFSET ?`;
                  
                  const result = db.exec(query, [limit, offset]);
                  
                  if (!result.length) return [];
                  
                  // Para cada linha, construir um objeto JSON
                  return result[0].values.map((row: any[]) => {
                    const obj: any = { rowid: row[0] };
                    columns.forEach((col: string, index: number) => {
                      obj[col] = row[index + 1]; // rowid é o primeiro, então desloca 1
                    });
                    return {
                      rowid: row[0],
                      json: JSON.stringify(obj)
                    };
                  });
                } catch (err) {
                  console.error(`Erro na tabela ${table}:`, err);
                  return [];
                }
              }
            ])
          )
        };

        // Cria o fetcher para o GraphiQL
        const graphqlFetcher = async (graphQLParams: any) => {
          try {
            const result = await graphql({
              schema,
              source: graphQLParams.query,
              variableValues: graphQLParams.variables,
              rootValue: root,
            });
            return result;
          } catch (error: any) {
            console.error("Erro na execução da query:", error);
            return {
              errors: [{
                message: error.message || "Erro desconhecido",
                stack: error.stack
              }]
            };
          }
        };

        if (mounted) {
          setFetcher(() => graphqlFetcher);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Erro na inicialização:", err);
        if (mounted) {
          setError(err.message || "Erro desconhecido");
          setLoading(false);
        }
      }
    }

    // Carrega o script do SQL.js
    const loadSQL = async () => {
      if (typeof window !== 'undefined' && !window.initSqlJs) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://sql.js.org/dist/sql-wasm.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      return Promise.resolve();
    };

    loadSQL()
      .then(() => initialize())
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando SQLite + GraphQL...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-bold mb-2">Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!fetcher) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p>Não foi possível inicializar o GraphiQL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <GraphiQL 
        fetcher={fetcher}
        defaultQuery={`# Bem-vindo ao GraphiQL
# Você pode listar as tabelas disponíveis com:
query ListTables {
  tables
}

# Ou consultar uma tabela (substitua "nome_da_tabela" pelo nome real)
# query GetData {
#   nome_da_tabela(limit: 10) {
#     rowid
#     json
#   }
# }
`}
      />
    </div>
  );
}
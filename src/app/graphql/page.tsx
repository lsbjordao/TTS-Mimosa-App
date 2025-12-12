"use client";

import { useEffect, useState, useRef } from "react";
import { graphql, buildSchema } from "graphql";
import { GraphiQL } from "graphiql";
import "graphiql/graphiql.css";
import "./graphiql-fix.css"; // Vamos criar este arquivo

// Inicialização do SQL.js
declare global {
  interface Window {
    initSqlJs: any;
    SQL: any;
  }
}

export default function GraphqlPage() {
  const [fetcher, setFetcher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphiqlContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Verifica se o SQL.js já está carregado
        if (!window.initSqlJs) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sql.js.org/dist/sql-wasm.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

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

        // Constrói tipos GraphQL dinamicamente para cada tabela
        const typeDefs = `
          scalar JSON

          type Query {
            tables: [String!]!
            ${tables.map((table: string) => 
              `${safeName(table)}(limit: Int = 10, offset: Int = 0): [JSON!]!`
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
              ({ limit = 10, offset = 0 }: { limit?: number; offset?: number }) => {
                try {
                  // Obtém informações das colunas
                  const pragmaResult = db.exec(`PRAGMA table_info("${table}")`);
                  if (!pragmaResult.length) return [];
                  
                  const columns = pragmaResult[0].values.map((col: any[]) => col[1]);
                  const selectColumns = columns.map((col: any) => `"${col}"`).join(', ');
                  
                  const query = `SELECT ${selectColumns} FROM "${table}" LIMIT ? OFFSET ?`;
                  const result = db.exec(query, [limit, offset]);
                  
                  if (!result.length) return [];
                  
                  const columnNames = result[0].columns;
                  return result[0].values.map((row: any[]) => {
                    const obj: any = {};
                    columnNames.forEach((col: string, index: number) => {
                      // Converte valores para tipos apropriados
                      const value = row[index];
                      obj[col] = value === null ? null : 
                        typeof value === 'number' ? value :
                        typeof value === 'boolean' ? value :
                        String(value);
                    });
                    return obj;
                  });
                } catch (err) {
                  console.error(`Erro na tabela ${table}:`, err);
                  return [];
                }
              }
            ])
          )
        };

        // Cria um scalar resolver para JSON
        const scalarJSON = {
          JSON: {
            __serialize: (value: any) => value,
            __parseValue: (value: any) => value,
            __parseLiteral: (ast: any) => {
              try {
                return JSON.parse(ast.value);
              } catch {
                return ast.value;
              }
            }
          }
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
                locations: error.locations,
                path: error.path
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

    // Pequeno delay para garantir que o DOM esteja pronto
    setTimeout(() => {
      initialize();
    }, 100);

    return () => {
      mounted = false;
    };
  }, []);

  // Efeito para forçar redimensionamento após carregamento
  useEffect(() => {
    if (!loading && !error && fetcher) {
      // Dispara um evento de redimensionamento para o GraphiQL
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [loading, error, fetcher]);

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
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-red-800 font-medium"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen" ref={graphiqlContainerRef}>
      {fetcher && (
        <GraphiQL 
          fetcher={fetcher}
          defaultEditorToolsVisibility={true}
          isHeadersEditorEnabled={false}
          shouldPersistHeaders={false}
        />
      )}
    </div>
  );
}
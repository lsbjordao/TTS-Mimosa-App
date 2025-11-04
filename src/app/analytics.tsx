"use client";

import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Cores padrão do ShadCN (você pode trocar por tokens do tema)
const COLORS = ["#6366f1", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics() {
  const [data, setData] = useState<any[]>([]);

  // Simulação de dados JSON que poderiam vir de um fetch()
  useEffect(() => {
    setData([
      { category: "API", count: 32 },
      { category: "Frontend", count: 21 },
      { category: "Database", count: 17 },
      { category: "Infra", count: 11 },
      { category: "Docs", count: 8 },
    ]);
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <a
            href="/docs"
            className="hover:text-primary transition-colors"
            title="Documentação"
          >
            Docs
          </a>
          <a
            href="/analytics"
            className="hover:text-primary transition-colors flex items-center gap-1"
            title="Relatórios analíticos"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </a>
          <button
            title="Buscar"
            className="hover:text-primary transition-colors"
          >
            🔍
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <ScrollArea className="h-[calc(100vh-6rem)]">
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="bar">Barras</TabsTrigger>
            <TabsTrigger value="pie">Pizza</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pie">
            <Card>
              <CardHeader>
                <CardTitle>Composição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

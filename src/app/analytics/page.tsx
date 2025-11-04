// ./src/app/analytics/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "./header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

// cores alternadas
const COLORS = ["#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export default function Analytics() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathsStats, setPathsStats] = useState<{ path: string; has: number; missing: number }[]>([]);

  // carregar JSON
  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => res.json())
      .then((data) => {
        setPlants(data);
        setPathsStats(analyzePaths(data));
      });
  }, []);

  // contar total de táxons
  const totalTaxa = plants.length;

  // analisar presença/ausência de caminhos JSON
  function analyzePaths(data: any[]): { path: string; has: number; missing: number }[] {
    const pathsSet = new Set<string>();

    // 🔍 descobrir todos os caminhos JSON possíveis
    const extractPaths = (obj: any, prefix = "") => {
      for (const [key, value] of Object.entries(obj || {})) {
        const path = prefix ? `${prefix}.${key}` : key;
        pathsSet.add(path);
        if (value && typeof value === "object" && !Array.isArray(value)) {
          extractPaths(value, path);
        }
      }
    };

    data.forEach((item) => extractPaths(item));

    // 🔢 calcular quantos têm e quantos não têm cada caminho
    const stats: { path: string; has: number; missing: number }[] = [];
    pathsSet.forEach((path) => {
      let has = 0;
      for (const obj of data) {
        const value = getByPath(obj, path);
        if (value !== undefined && value !== null && JSON.stringify(value) !== "{}" && JSON.stringify(value) !== "[]") {
          has++;
        }
      }
      stats.push({ path, has, missing: data.length - has });
    });

    // ordenar por completude decrescente
    return stats.sort((a, b) => b.has - a.has);
  }

  // utilitário: buscar valor por caminho ("a.b.c")
  function getByPath(obj: any, path: string): any {
    return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  // apenas os 10 caminhos mais relevantes
  const topPaths = useMemo(() => pathsStats.slice(0, 10), [pathsStats]);

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      <Header />

      <ScrollArea className="flex-1 p-6 space-y-6">
        {/* número total de táxons */}
        <div className="flex justify-center items-center">
          <Card className="w-[300px] text-center shadow-lg">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary">{totalTaxa}</CardTitle>
              <p className="text-sm text-muted-foreground">Total of taxa</p>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="completeness" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="completeness">Field completeness</TabsTrigger>
          </TabsList>

          <TabsContent value="completeness" className="space-y-6">
            {topPaths.map((p, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base font-medium">{p.path}</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Has value", value: p.has },
                          { name: "Missing", value: p.missing },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        <Cell fill={COLORS[2]} />
                        <Cell fill={COLORS[4]} />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}

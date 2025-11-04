// ./src/app/analytics/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "./header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#22d3ee", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export default function Analytics() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathsStats, setPathsStats] = useState<
    { path: string; has: number; missing: number }[]
  >([]);

  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => res.json())
      .then((data) => {
        setPlants(data);
        setPathsStats(analyzePaths(data));
      });
  }, []);

  const totalTaxa = plants.length;
  const totalPaths = pathsStats.length;

  const avgCompleteness = useMemo(() => {
    if (!pathsStats.length) return 0;
    const totalRatio = pathsStats.reduce(
      (acc, p) => acc + p.has / totalTaxa,
      0
    );
    return (totalRatio / pathsStats.length) * 100;
  }, [pathsStats, totalTaxa]);

  /** 🔍 Percorre recursivamente objetos e arrays */
  function extractPaths(obj: any, prefix = "", paths: Set<string>) {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => extractPaths(v, `${prefix}[]`, paths));
    } else if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = prefix ? `${prefix}.${key}` : key;
        paths.add(newPath);
        extractPaths(value, newPath, paths);
      }
    }
  }

  /** ⚙️ Calcula presença/ausência de valores em cada caminho JSON */
  function analyzePaths(data: any[]) {
    const paths = new Set<string>();
    data.forEach((item) => extractPaths(item, "", paths));

    const stats: { path: string; has: number; missing: number }[] = [];

    for (const path of paths) {
      let has = 0;
      for (const obj of data) {
        const value = getByPath(obj, path);
        if (
          value !== undefined &&
          value !== null &&
          JSON.stringify(value) !== "{}" &&
          JSON.stringify(value) !== "[]" &&
          value !== ""
        ) {
          has++;
        }
      }
      stats.push({ path, has, missing: data.length - has });
    }

    // ordena por taxa de preenchimento decrescente
    return stats.sort((a, b) => b.has - a.has);
  }

  /** ⚙️ Busca valor por caminho tipo "a.b.c" */
  function getByPath(obj: any, path: string) {
    return path
      .replace(/\[\]/g, "")
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  const topFilled = useMemo(() => pathsStats.slice(0, 15), [pathsStats]);

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground">
      <Header />

      <ScrollArea className="flex-1 p-6 space-y-8">
        {/* 💡 Resumo geral */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">
                {totalTaxa}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Total of taxa</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">
                {totalPaths}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Detected JSON paths</p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">
                {avgCompleteness.toFixed(1)}%
              </CardTitle>
              <p className="text-sm text-muted-foreground">Average completeness</p>
            </CardHeader>
          </Card>
        </div>

        {/* Espaço maior entre resumo e tabs */}
        <div className="mt-6">
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="fields">Field completeness</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* 🍰 Campos em 3 colunas */}
            <TabsContent value="fields" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topFilled.map((p, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-base font-medium">{p.path}</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[240px] flex justify-center items-center">
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

            {/* 📊 Overview com barras */}
            <TabsContent value="overview" className="space-y-4">
              {pathsStats.slice(0, 50).map((p, i) => {
                const percent = (p.has / totalTaxa) * 100;
                return (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-medium truncate">
                          {p.path}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={percent} className="h-2" />
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

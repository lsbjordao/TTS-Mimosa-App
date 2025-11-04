// ./src/app/analytics/page.tsx

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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

const COLORS = ["#60A5FA", "#A1A1AA"];

export default function Analytics() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathsStats, setPathsStats] = useState<
    { path: string; hasKey: number; hasValue: number; missing: number }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 termo de busca
  const [visibleCount, setVisibleCount] = useState(30);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => res.json())
      .then((data) => {
        setPlants(data);
        setPathsStats(analyzePaths(data));
      });
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, pathsStats.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [pathsStats]);

  const totalTaxa = plants.length;
  const totalPaths = pathsStats.length;

  const avgCompleteness = useMemo(() => {
    if (!pathsStats.length) return 0;
    const totalRatio = pathsStats.reduce(
      (acc, p) => acc + p.hasValue / totalTaxa,
      0
    );
    return (totalRatio / pathsStats.length) * 100;
  }, [pathsStats, totalTaxa]);

  /** 🔍 Filtragem dos paths conforme termo digitado */
  const filteredPaths = useMemo(() => {
    if (!searchTerm.trim()) return pathsStats;
    return pathsStats.filter((p) =>
      p.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pathsStats, searchTerm]);

  function extractPaths(obj: any, prefix = "", paths: Set<string>) {
    if (Array.isArray(obj)) {
      obj.forEach((v) => extractPaths(v, `${prefix}[]`, paths));
    } else if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = prefix ? `${prefix}.${key}` : key;
        paths.add(newPath);
        extractPaths(value, newPath, paths);
      }
    }
  }

  function analyzePaths(data: any[]) {
    const paths = new Set<string>();
    data.forEach((item) => extractPaths(item, "", paths));

    const stats: { path: string; hasKey: number; hasValue: number; missing: number }[] = [];

    for (const path of paths) {
      let hasKey = 0;
      let hasValue = 0;

      for (const obj of data) {
        const val = getByPath(obj, path);
        if (val !== undefined) hasKey++;
        if (
          val !== undefined &&
          val !== null &&
          JSON.stringify(val) !== "{}" &&
          JSON.stringify(val) !== "[]" &&
          val !== ""
        ) {
          hasValue++;
        }
      }

      stats.push({
        path,
        hasKey,
        hasValue,
        missing: data.length - hasKey,
      });
    }

    return stats.sort((a, b) => b.hasValue - a.hasValue);
  }

  function getByPath(obj: any, path: string) {
    return path
      .replace(/\[\]/g, "")
      .split(".")
      .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground">
      {/* Header agora recebe o termo e o setter */}
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

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

        <div className="mt-6">
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="fields">Field completeness</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>

            {/* 🍰 Campos simplificados (Has data / No data) */}
            <TabsContent
              value="fields"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredPaths.slice(0, visibleCount).map((p, i) => {
                const hasData = p.hasValue;
                const noData = totalTaxa - hasData;
                return (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium">{p.path}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[240px] flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Has data", value: hasData },
                              { name: "No data", value: noData },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            <Cell fill={COLORS[0]} />
                            <Cell fill={COLORS[1]} />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* 📊 Overview com lazy loading funcional */}
            <TabsContent
              value="overview"
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {filteredPaths.slice(0, visibleCount).map((p, i) => {
                const percent = (p.hasValue / totalTaxa) * 100;
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

        <div
          ref={loadMoreRef}
          className="col-span-full h-12 flex justify-center items-center text-muted-foreground"
        >
          {visibleCount < filteredPaths.length
            ? "Carregando mais..."
            : "Todos os campos carregados ✅"}
        </div>
      </ScrollArea>
    </div>
  );
}

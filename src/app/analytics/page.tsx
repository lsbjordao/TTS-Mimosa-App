"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Header from "./header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const COLORS = ["#60A5FA", "#A1A1AA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

export default function Analytics() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathsStats, setPathsStats] = useState<
    { path: string; hasKey: number; hasValue: number; values?: Record<string, number> }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState("completeness");
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

    const stats: {
      path: string;
      hasKey: number;
      hasValue: number;
      values?: Record<string, number>;
    }[] = [];

    for (const path of paths) {
      let hasKey = 0;
      let hasValue = 0;
      const valueCounts: Record<string, number> = {};

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
          if (typeof val === "string") {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
          } else if (Array.isArray(val)) {
            val
              .filter((v) => typeof v === "string")
              .forEach((v) => (valueCounts[v] = (valueCounts[v] || 0) + 1));
          }
        }
      }

      stats.push({
        path,
        hasKey,
        hasValue,
        values:
          Object.keys(valueCounts).length > 0
            ? Object.fromEntries(
              Object.entries(valueCounts).sort((a, b) => b[1] - a[1])
            )
            : undefined,
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

  const averageCompleteness =
    plants.length && pathsStats.length
      ? (
        (pathsStats.reduce((acc, p) => acc + p.hasValue / plants.length, 0) /
          pathsStats.length) *
        100
      ).toFixed(1) + "%"
      : "0%";

  // Ajuste da grid para que o card de Average Completeness some quando a aba não for "completeness"
  const cardsToShow = activeTab === "completeness" ? 3 : 2;
  const gridColsClass =
    cardsToShow === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-2";

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background">
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      {/* Big Number Cards */}
      <div className="grid grid-cols-3 gap-4 text-center mt-4 px-4"> {/* px-4 para margem lateral */}
        {/* Total of taxa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-primary">{plants.length}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Total of taxa</p>
          </CardHeader>
        </Card>

        {/* Detected JSON paths */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-3xl font-bold text-primary">{pathsStats.length}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Detected JSON paths</p>
          </CardHeader>
        </Card>

        {/* Average Completeness / placeholder */}
        {activeTab === "completeness" ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold text-primary">{averageCompleteness}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Average Completeness</p>
            </CardHeader>
          </Card>
        ) : (
          <div /> // Placeholder vazio para manter a coluna
        )}
      </div>

      {/* Tabs */}
      <div className="p-6 space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 rounded-xl p-1 w-fit mb-6">
            <TabsTrigger
              value="completeness"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Field completeness
            </TabsTrigger>
            <TabsTrigger
              value="values"
              className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Field values
            </TabsTrigger>
          </TabsList>

          {/* Field Completeness */}
          <TabsContent value="completeness">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths.slice(0, visibleCount).map((p, i) => {
                const hasData = p.hasValue;
                const noData = plants.length - hasData;
                return (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium truncate">{p.path}</CardTitle>
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
                          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ marginTop: 16 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div
              ref={loadMoreRef}
              className="col-span-full h-12 flex justify-center items-center text-muted-foreground"
            >
              {visibleCount < filteredPaths.length
                ? "Carregando mais..."
                : "Todos os campos carregados ✅"}
            </div>
          </TabsContent>

          {/* Field Values */}
          <TabsContent value="values">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPaths
                .filter(
                  (p) =>
                    p.values &&
                    Object.keys(p.values).length > 1 &&
                    !p.path.endsWith("specificEpithet")
                )
                .slice(0, visibleCount)
                .map((p, i) => {
                  const data = Object.entries(p.values!).map(([k, v]) => ({
                    name: k,
                    value: v,
                  }));
                  return (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base font-medium truncate">{p.path}</CardTitle>
                      </CardHeader>
                      <CardContent className="h-[240px] flex justify-center items-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={({ name }) => name}
                            >
                              {data.map((_, j) => (
                                <Cell key={j} fill={COLORS[j % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ marginTop: 16 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

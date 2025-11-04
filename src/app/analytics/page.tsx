"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Header from "./header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#60A5FA", "#A1A1AA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

export default function Analytics() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathsStats, setPathsStats] = useState<
    { path: string; hasKey: number; hasValue: number; values?: Record<string, number> }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [activeTab, setActiveTab] = useState<"completeness" | "values">("completeness");
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

  /** 🔍 Filtragem pelo termo buscado */
  const filteredPaths = useMemo(() => {
    if (!searchTerm.trim()) return pathsStats;
    return pathsStats.filter((p) =>
      p.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pathsStats, searchTerm]);

  /** 🔬 Extração de todos os paths do JSON */
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

  /** 📊 Analisa completude e valores de cada campo */
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

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground">
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

      <ScrollArea className="flex-1 p-6 space-y-8">
        {/* 💡 Resumo geral */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary">
                {plants.length}
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
        </div>

        {/* 🔄 Tabs */}
        <div className="mt-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab("completeness")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "completeness"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              Field completeness
            </button>
            <button
              onClick={() => setActiveTab("values")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "values"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              Field values
            </button>
          </div>

          {/* 🍰 1️⃣ Field completeness */}
          {activeTab === "completeness" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPaths.slice(0, visibleCount).map((p, i) => {
                  const hasData = p.hasValue;
                  const noData = plants.length - hasData;
                  return (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base font-medium truncate">
                          {p.path}
                        </CardTitle>
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
              </div>

              <div
                ref={loadMoreRef}
                className="col-span-full h-12 flex justify-center items-center text-muted-foreground"
              >
                {visibleCount < filteredPaths.length
                  ? "Carregando mais..."
                  : "Todos os campos carregados ✅"}
              </div>
            </>
          )}

          {/* 🍰 2️⃣ Field values */}
          {activeTab === "values" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPaths
                  .filter((p) => p.values && Object.keys(p.values).length > 1)
                  .slice(0, visibleCount)
                  .map((p, i) => {
                    const data = Object.entries(p.values!).map(([k, v]) => ({
                      name: k,
                      value: v,
                    }));
                    return (
                      <Card key={i}>
                        <CardHeader>
                          <CardTitle className="text-base font-medium truncate">
                            {p.path}
                          </CardTitle>
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
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Header from "./header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import Image from "next/image";

interface Filter {
  mode: "property" | "property_value";
  path: string;
  value: string;
}

export default function FilterPage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [stringPaths, setStringPaths] = useState<
    { path: string; options: string[] }[]
  >([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<any[]>([]);

  function getByPath(obj: any, path: string) {
    return path
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
      );
  }

  function extractStringPaths(data: any[]) {
    const paths: Record<string, Set<string>> = {};
    function recurse(obj: any, prefix = "") {
      if (Array.isArray(obj)) obj.forEach((v) => recurse(v, prefix));
      else if (obj && typeof obj === "object") {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = prefix ? `${prefix}.${key}` : key;
          if (typeof value === "string" && value.trim() !== "") {
            if (!paths[newPath]) paths[newPath] = new Set();
            paths[newPath].add(value);
          } else recurse(value, newPath);
        }
      }
    }
    data.forEach((item) => recurse(item));
    return Object.entries(paths)
      .map(([path, set]) => ({
        path,
        options: Array.from(set).sort(),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  function extractImagesWithPaths(obj: any, path: string[] = []) {
    let results: { path: string; url: string; legend?: string }[] = [];
    if (Array.isArray(obj)) {
      obj.forEach((item, i) =>
        results.push(...extractImagesWithPaths(item, [...path, `[${i}]`]))
      );
    } else if (typeof obj === "object" && obj !== null) {
      let url, legend;
      for (const [key, value] of Object.entries(obj)) {
        if (key === "imageUrl") url = value as string;
        else if (key === "imageUrlLegend") legend = value as string;
        else results.push(...extractImagesWithPaths(value, [...path, key]));
      }
      if (url) results.push({ path: path.join(".") || "root", url, legend });
    }
    return results;
  }

  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => res.json())
      .then((data) => {
        setPlants(data);
        setStringPaths(extractStringPaths(data));
        setFilteredPlants(data);
      });
  }, []);

  // aplicar filtros
  useEffect(() => {
    if (filters.length === 0) {
      setFilteredPlants(plants);
      return;
    }
    const filtered = plants.filter((p) =>
      filters.every((f) => {
        if (f.mode === "property_value") {
          return getByPath(p, f.path) === f.value;
        } else {
          return Object.keys(p)
            .join(".")
            .includes(f.path.split(".").slice(-1)[0]); // busca simples
        }
      })
    );
    setFilteredPlants(filtered);
  }, [filters, plants]);

  const addFilter = () => {
    setFilters([...filters, { mode: "property_value", path: "", value: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (
    index: number,
    field: keyof Filter,
    value: string | "property" | "property_value"
  ) => {
    const newFilters = [...filters];
    (newFilters[index] as any)[field] = value;
    if (field === "mode") {
      newFilters[index].path = "";
      newFilters[index].value = "";
    }
    if (field === "path") newFilters[index].value = "";
    setFilters(newFilters);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <Header />
      </div>

      <div className="grid grid-cols-[300px_1fr_300px] flex-1 min-h-0">
        {/* esquerda */}
        <ScrollArea className="border-r border-border flex-1 overflow-auto p-4 dark-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle>Taxa ({filteredPlants.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {filteredPlants.map((p, i) => (
                <p key={i} className="text-sm italic">
                  Mimosa {p.specificEpithet || "sp."}
                </p>
              ))}
            </CardContent>
          </Card>
        </ScrollArea>

        {/* centro */}
        <main className="p-6 overflow-auto dark-scrollbar space-y-4">
          <h2 className="text-lg font-semibold">Filtering</h2>

          <div className="space-y-3">
            {filters.map((f, i) => {
              const selectedPath = stringPaths.find((sp) => sp.path === f.path);
              const valueOptions = selectedPath?.options || [];

              return (
                <div key={i} className="flex items-center gap-2">
                  {/* seletor de modo */}
                  <Select
                    value={f.mode}
                    onValueChange={(v) =>
                      updateFilter(i, "mode", v as "property" | "property_value")
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="property_value">
                        Property + Value
                      </SelectItem>

                    </SelectContent>
                  </Select>

                  {/* property: Command com busca */}
                  {f.mode === "property" && (
                    <div className="w-full flex-1 border rounded-md">
                      <Command>
                        <CommandInput placeholder="Search property..." />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                            {stringPaths.map((sp) => (
                              <CommandItem
                                key={sp.path}
                                onSelect={() =>
                                  updateFilter(i, "path", sp.path)
                                }
                              >
                                {sp.path}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}

                  {/* property_value: Command + Select */}
                  {f.mode === "property_value" && (
                    <>
                      <div className="w-full flex-1 border rounded-md">
                        <Command>
                          <CommandInput placeholder="Search field..." />
                          <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                              {stringPaths.map((sp) => (
                                <CommandItem
                                  key={sp.path}
                                  onSelect={() =>
                                    updateFilter(i, "path", sp.path)
                                  }
                                >
                                  {sp.path}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>

                      <Select
                        onValueChange={(value) =>
                          updateFilter(i, "value", value)
                        }
                        value={f.value}
                        disabled={!f.path}
                      >
                        <SelectTrigger className="w-full flex-1">
                          <SelectValue placeholder="Select value..." />
                        </SelectTrigger>
                        <SelectContent>
                          {valueOptions.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(i)}
                    title="Remove filter"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={addFilter}
            className="flex items-center gap-1 mt-2"
          >
            <Plus className="w-4 h-4" /> Add filter
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            {filters.length
              ? `Showing ${filteredPlants.length} taxa matching selected filters.`
              : "Add filters to narrow down taxa."}
          </p>
        </main>

        {/* direita: imagens */}
        <ScrollArea className="border-l border-border flex-1 overflow-auto p-4 dark-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredPlants.length === 0 ? (
                <p className="text-muted-foreground text-sm">No matches.</p>
              ) : (
                filteredPlants.flatMap((p, idx) => {
                  const imgs = extractImagesWithPaths(p);
                  return imgs.length > 0 ? (
                    <div key={idx}>
                      <p className="text-sm text-primary italic text-center mb-1">
                        Mimosa {p.specificEpithet}
                      </p>
                      {imgs.map((img, j) => (
                        <div key={j} className="mb-2">
                          <Image
                            src={img.url}
                            alt={img.legend || ""}
                            width={300}
                            height={200}
                            className="rounded-md border border-border"
                          />
                          {img.legend && (
                            <p className="text-xs text-muted-foreground italic text-center mt-1">
                              {img.legend}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })
              )}
            </CardContent>
          </Card>
        </ScrollArea>
      </div>
    </div>
  );
}

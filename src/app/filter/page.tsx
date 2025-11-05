// ./src/app/filter/page.tsx

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
import { X, Plus, ChevronDown, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

interface Filter {
  mode: "property" | "property_value";
  path: string;
  value: string;
  enabled: boolean;
}

export default function FilterPage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [stringPaths, setStringPaths] = useState<
    { path: string; options: string[] }[]
  >([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<any[]>([]);
  const [propertySearch, setPropertySearch] = useState<string>("");
  const [openPropertySelect, setOpenPropertySelect] = useState<number | null>(null);

  function getByPath(obj: any, path: string) {
    return path
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
      );
  }

  function extractStringPaths(data: any[]): { path: string; options: string[] }[] {
    const paths: Record<string, Set<string>> = {};
    
    function traverse(obj: any, currentPath: string = "", depth: number = 0) {
      // Limitar profundidade para evitar recursão infinita
      if (depth > 10) return;
      
      if (obj === null || obj === undefined) return;

      if (typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' && value.trim() !== '') {
              if (!paths[newPath]) paths[newPath] = new Set();
              paths[newPath].add(value);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
              if (!paths[newPath]) paths[newPath] = new Set();
              paths[newPath].add(value.toString());
            } else if (Array.isArray(value)) {
              // Para arrays, adiciona o caminho e processa alguns itens (não todos)
              if (!paths[newPath]) paths[newPath] = new Set();
              paths[newPath].add(`[array:${value.length}]`);
              
              // Processa apenas os primeiros 5 itens para evitar explosão de memória
              value.slice(0, 5).forEach((item, index) => {
                traverse(item, `${newPath}[${index}]`, depth + 1);
              });
            } else if (typeof value === 'object') {
              if (!paths[newPath]) paths[newPath] = new Set();
              paths[newPath].add('[object]');
              traverse(value, newPath, depth + 1);
            }
          }
        }
      }
    }

    // Processa apenas os primeiros 10 itens para evitar sobrecarga
    const sampleData = data.slice(0, 10);
    sampleData.forEach((item) => {
      traverse(item);
    });

    // Converte para array e filtra caminhos muito longos
    return Object.entries(paths)
      .map(([path, set]) => ({
        path,
        options: Array.from(set).sort().slice(0, 100), // Limita opções por caminho
      }))
      .filter(item => item.path.length < 100) // Filtra caminhos muito longos
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
        const extractedPaths = extractStringPaths(data);
        setStringPaths(extractedPaths);
        console.log("Total paths extracted:", extractedPaths.length);
        console.log("Sample paths:", extractedPaths.slice(0, 10));
        setFilteredPlants(data);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
      });
  }, []);

  // aplicar filtros
  useEffect(() => {
    if (filters.length === 0) {
      setFilteredPlants(plants);
      return;
    }

    const activeFilters = filters.filter(f => f.enabled);
    
    if (activeFilters.length === 0) {
      setFilteredPlants(plants);
      return;
    }

    const filtered = plants.filter((p) =>
      activeFilters.every((f) => {
        if (f.mode === "property_value") {
          return getByPath(p, f.path) === f.value;
        } else if (f.mode === "property") {
          return getByPath(p, f.path) !== undefined;
        }
        return true;
      })
    );
    setFilteredPlants(filtered);
  }, [filters, plants]);

  const addFilter = () => {
    setFilters([...filters, { mode: "property", path: "", value: "", enabled: true }]);
    setPropertySearch("");
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const toggleFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters[index].enabled = !newFilters[index].enabled;
    setFilters(newFilters);
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
      setPropertySearch("");
    }
    if (field === "path") {
      newFilters[index].value = "";
    }
    setFilters(newFilters);
  };

  const handlePropertyInputChange = (index: number, value: string) => {
    const newFilters = [...filters];
    newFilters[index].path = value;
    setFilters(newFilters);
  };

  const filteredStringPaths = stringPaths.filter((sp) =>
    sp.path.toLowerCase().includes(propertySearch.toLowerCase())
  );

  return (
    <div className="w-full h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <Header />
      </div>

      <div className="grid grid-cols-[280px_1fr_280px] flex-1 min-h-0">
        {/* Lista esquerda */}
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

        {/* Centro */}
        <main className="p-6 overflow-auto dark-scrollbar space-y-4">
          <h2 className="text-lg font-semibold">Filtering</h2>

          <div className="space-y-4">
            {filters.map((f, i) => {
              const selectedPath = stringPaths.find((sp) => sp.path === f.path);
              const valueOptions = selectedPath?.options || [];

              return (
                <div
                  key={i}
                  className={`border border-border p-3 rounded-lg space-y-2 ${
                    f.enabled ? "bg-card" : "bg-muted/30 opacity-70"
                  }`}
                >
                  {/* Cabeçalho com controles */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Botão para ativar/desativar filtro */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFilter(i)}
                        title={f.enabled ? "Disable filter" : "Enable filter"}
                        className="h-8 w-8"
                      >
                        {f.enabled ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>

                      <Select
                        value={f.mode}
                        onValueChange={(v) =>
                          updateFilter(
                            i,
                            "mode",
                            v as "property" | "property_value"
                          )
                        }
                      >
                        <SelectTrigger className="w-[180px] text-sm">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="property">Property</SelectItem>
                          <SelectItem value="property_value">
                            Property and Value
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFilter(i)}
                      title="Remove filter"
                      className="h-8 w-8"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Campo de filtragem dependendo do modo */}
                  {f.mode === "property" ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Search property path</p>
                      <div className="border rounded-md">
                        <Command>
                          <CommandInput 
                            placeholder="Type property path (e.g., trichomes.filiform)..." 
                            value={f.path}
                            onValueChange={(value) => handlePropertyInputChange(i, value)}
                          />
                          <CommandList className="max-h-[200px] overflow-auto">
                            <CommandEmpty>No matching fields.</CommandEmpty>
                            <CommandGroup>
                              {filteredStringPaths.map((sp) => (
                                <CommandItem
                                  key={sp.path}
                                  className="text-xs py-1"
                                  onSelect={() => handlePropertyInputChange(i, sp.path)}
                                >
                                  {sp.path}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                      {f.path && (
                        <p className="text-xs text-muted-foreground">
                          Filtering by property path: <span className="font-medium">"{f.path}"</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Search property and value</p>

                      {/* Selector de campo */}
                      <Select
                        open={openPropertySelect === i}
                        onOpenChange={(open) => setOpenPropertySelect(open ? i : null)}
                        value={f.path}
                        onValueChange={(value) => updateFilter(i, "path", value)}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <SelectValue>
                            {f.path || "Select property..."}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-auto">
                          <div className="p-1">
                            <Command>
                              <CommandInput 
                                placeholder="Search property..." 
                                className="h-9"
                                onValueChange={(value) => setPropertySearch(value)}
                              />
                              <CommandList className="max-h-[240px]">
                                <CommandEmpty>No matching fields.</CommandEmpty>
                                <CommandGroup>
                                  {stringPaths
                                    .filter((sp) =>
                                      sp.path.toLowerCase().includes(propertySearch.toLowerCase())
                                    )
                                    .map((sp) => (
                                    <CommandItem
                                      key={sp.path}
                                      value={sp.path}
                                      onSelect={() => {
                                        updateFilter(i, "path", sp.path);
                                        setOpenPropertySelect(null);
                                        setPropertySearch("");
                                      }}
                                      className="text-xs py-1"
                                    >
                                      {sp.path}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                        </SelectContent>
                      </Select>

                      {/* Selector de valores */}
                      {f.path && (
                        <Select
                          onValueChange={(value) =>
                            updateFilter(i, "value", value)
                          }
                          value={f.value}
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-auto">
                            {valueOptions.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {/* Indicador de status do filtro */}
                  {!f.enabled && (
                    <p className="text-xs text-muted-foreground italic">
                      Filter disabled
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={addFilter}
            className="flex items-center gap-1 mt-2"
          >
            <Plus className="w-4 h-4" /> Add Filter
          </Button>

          <p className="text-sm text-muted-foreground mt-4">
            {filters.some(f => f.enabled)
              ? `Showing ${filteredPlants.length} taxa matching active filters.`
              : filters.length
              ? "All filters are disabled. Showing all taxa."
              : "Add filters to narrow down taxa."}
          </p>
        </main>

        {/* Painel direito com imagens */}
        <ScrollArea className="border-l border-border flex-1 overflow-auto p-4 dark-scrollbar">
          <Card className="bg-card text-card-foreground">
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
                            width={260}
                            height={180}
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
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
import { X, Plus, ChevronDown, Eye, EyeOff, Search } from "lucide-react";
import Image from "next/image";

interface Filter {
  mode: "property" | "property_value";
  path: string;
  value: string;
  enabled: boolean;
}

interface PathData {
  allPaths: string[]; // Para modo "property" - todas as chaves
  valuePaths: { path: string; options: string[] }[]; // Para modo "property_value" - só com valores
}

export default function FilterPage() {
  const [plants, setPlants] = useState<any[]>([]);
  const [pathData, setPathData] = useState<PathData>({
    allPaths: [],
    valuePaths: []
  });
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<any[]>([]);
  const [filteredImages, setFilteredImages] = useState<
    { path: string; url: string; legend?: string; specificEpithet?: string }[]
  >([]);
  const [propertySearch, setPropertySearch] = useState<string>("");
  const [openPropertySelect, setOpenPropertySelect] = useState<number | null>(null);
  const [openPropertySearch, setOpenPropertySearch] = useState<number | null>(null);

  // Estado para controle do modal de imagem
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [allImages, setAllImages] = useState<
    { path: string; url: string; legend?: string; specificEpithet?: string }[]
  >([]);

  function getByPath(obj: any, path: string) {
    return path
      .split(".")
      .reduce(
        (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
        obj
      );
  }

  // Função auxiliar para comparar valores convertendo tipos
  function compareValues(jsonValue: any, filterValue: string): boolean {
    if (typeof jsonValue === 'string' && typeof filterValue === 'string') {
      return jsonValue === filterValue;
    }
    
    const jsonNum = typeof jsonValue === 'number' ? jsonValue : Number(jsonValue);
    const filterNum = Number(filterValue);
    
    if (!isNaN(jsonNum) && !isNaN(filterNum)) {
      return jsonNum === filterNum;
    }
    
    return String(jsonValue) === String(filterValue);
  }

  function extractPathsByMode(data: any[]): PathData {
    const allPathsSet = new Set<string>();
    const valuePaths: Record<string, Set<string>> = {};
    
    function traverse(obj: any, currentPath: string = ""): void {
      if (obj === null || obj === undefined) return;

      if (typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = currentPath ? `${currentPath}.${key}` : key;
          
          allPathsSet.add(newPath);

          if (value !== null && value !== undefined) {
            const isPrimitive = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
            const isPrimitiveArray = Array.isArray(value) && value.length > 0 && 
              value.some(item => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean');
            
            if (isPrimitive) {
              if (!valuePaths[newPath]) valuePaths[newPath] = new Set();
              if (typeof value === 'number') {
                valuePaths[newPath].add(value.toString());
              } else if (typeof value === 'string' && value.trim() !== '') {
                valuePaths[newPath].add(value);
              } else if (typeof value === 'boolean') {
                valuePaths[newPath].add(value.toString());
              }
            } 
            else if (isPrimitiveArray) {
              if (!valuePaths[newPath]) valuePaths[newPath] = new Set();
              value.forEach(item => {
                if (typeof item === 'number') {
                  valuePaths[newPath].add(item.toString());
                } else if (typeof item === 'string' && item.trim() !== '') {
                  valuePaths[newPath].add(item);
                } else if (typeof item === 'boolean') {
                  valuePaths[newPath].add(item.toString());
                }
              });
            }
            
            if (typeof value === 'object') {
              traverse(value, newPath);
            }
          }
        }
      }
    }

    data.forEach((item) => {
      traverse(item);
    });

    const allPaths = Array.from(allPathsSet)
      .filter(path => path && path.trim() !== '' && !path.includes('[') && !path.includes(']'))
      .sort();

    const valuePathsResult = Object.entries(valuePaths)
      .map(([path, set]) => ({
        path,
        options: Array.from(set)
          .filter(opt => opt && opt.trim() !== '')
          .sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.localeCompare(b);
          })
      }))
      .filter(item => item.options.length > 0)
      .sort((a, b) => a.path.localeCompare(b.path));

    return {
      allPaths,
      valuePaths: valuePathsResult
    };
  }

  // ---------- Função auxiliar MELHORADA: extrai imagens ----------
  function extractImagesWithPaths(obj: any, currentPath: string[] = []): { path: string; url: string; legend?: string }[] {
    const results: { path: string; url: string; legend?: string }[] = [];
    
    if (!obj || typeof obj !== 'object') return results;

    // Se é um array, processa cada item
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        results.push(...extractImagesWithPaths(item, [...currentPath, `[${index}]`]));
      });
      return results;
    }

    // Verifica se este objeto tem propriedades de imagem
    const imageKeys = Object.keys(obj).filter(key => 
      key.toLowerCase().includes('image') || 
      key.toLowerCase().includes('url') ||
      key.toLowerCase().includes('photo')
    );

    // Log para debug - mostra as chaves que podem conter imagens
    if (imageKeys.length > 0) {
      console.log(`Encontradas chaves de imagem em ${currentPath.join('.')}:`, imageKeys);
    }

    // Procura por URLs de imagem em várias possíveis propriedades
    let imageUrl: string | undefined;
    let legend: string | undefined;

    // Verifica várias possíveis propriedades de imagem
    if (obj.imageUrl && typeof obj.imageUrl === 'string') {
      imageUrl = obj.imageUrl;
    } else if (obj.url && typeof obj.url === 'string' && obj.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      imageUrl = obj.url;
    } else if (obj.src && typeof obj.src === 'string' && obj.src.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      imageUrl = obj.src;
    } else if (obj.photo && typeof obj.photo === 'string' && obj.photo.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      imageUrl = obj.photo;
    }

    // Verifica várias possíveis propriedades de legenda
    if (obj.imageUrlLegend && typeof obj.imageUrlLegend === 'string') {
      legend = obj.imageUrlLegend;
    } else if (obj.legend && typeof obj.legend === 'string') {
      legend = obj.legend;
    } else if (obj.caption && typeof obj.caption === 'string') {
      legend = obj.caption;
    } else if (obj.description && typeof obj.description === 'string') {
      legend = obj.description;
    }

    // Se encontrou uma imagem, adiciona aos resultados
    if (imageUrl) {
      const path = currentPath.join('.') || 'root';
      console.log(`✅ Imagem encontrada: ${imageUrl} em ${path}`);
      results.push({
        path,
        url: imageUrl,
        legend
      });
    }

    // Continua procurando em outras propriedades (exceto as que já verificamos)
    for (const [key, value] of Object.entries(obj)) {
      // Pula propriedades que já verificamos para imagens
      if ([
        'imageUrl', 'url', 'src', 'photo', 
        'imageUrlLegend', 'legend', 'caption', 'description'
      ].includes(key)) {
        continue;
      }

      // Se o valor é um objeto ou array, continua a busca recursiva
      if (value && typeof value === 'object') {
        results.push(...extractImagesWithPaths(value, [...currentPath, key]));
      }
    }

    return results;
  }

  // ---------- Função auxiliar: insere <wbr/> a cada 3 pontos ----------
  function renderPathGrouped(path: string, groupSize = 3) {
    const parts = path.split(".");
    const groups: string[] = [];
    for (let i = 0; i < parts.length; i += groupSize) {
      groups.push(parts.slice(i, i + groupSize).join("."));
    }
    return groups.flatMap((g, i) =>
      i === groups.length - 1 ? [g] : [g, <wbr key={i} />]
    );
  }

  // ---------- Função para filtrar imagens com base nos filtros ativos ----------
  function filterImages(plants: any[], activeFilters: Filter[]) {
    if (activeFilters.length === 0) {
      return allImages;
    }

    const filtered = allImages.filter(img => {
      const plant = plants.find(p => p.specificEpithet === img.specificEpithet);
      if (!plant) return false;

      return activeFilters.every((f) => {
        if (f.mode === "property_value") {
          const value = getByPath(plant, f.path);
          if (value === null || value === undefined) return false;
          if (Array.isArray(value)) {
            return value.some(item => compareValues(item, f.value));
          }
          return compareValues(value, f.value);
        } else if (f.mode === "property") {
          return getByPath(plant, f.path) !== undefined;
        }
        return true;
      });
    });

    console.log(`Filtradas ${filtered.length} imagens de ${allImages.length} totais`);
    return filtered;
  }

  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Dados carregados:", data.length, "plantas");
        setPlants(data);
        const extractedPaths = extractPathsByMode(data);
        setPathData(extractedPaths);
        setFilteredPlants(data);

        // Extrai todas as imagens globais - COM MAIS LOGS PARA DEBUG
        console.log("Iniciando extração de imagens...");
        const all = data.flatMap((plant: any) => {
          const images = extractImagesWithPaths(plant);
          if (images.length > 0) {
            console.log(`✅ Planta ${plant.specificEpithet}: ${images.length} imagens encontradas`);
            images.forEach(img => console.log(`   📷 ${img.url}`));
          } else {
            console.log(`❌ Planta ${plant.specificEpithet}: NENHUMA imagem encontrada`);
            // Log da estrutura da planta para debug
            console.log("Estrutura da planta:", Object.keys(plant));
          }
          return images.map((img) => ({
            ...img,
            specificEpithet: plant.specificEpithet,
          }));
        });
        
        console.log("🚀 Total de imagens extraídas:", all.length);
        if (all.length === 0) {
          console.log("❌ NENHUMA IMAGEM ENCONTRADA! Verificando estrutura do JSON...");
          // Examina algumas plantas para ver a estrutura
          data.slice(0, 3).forEach((plant: any, index: number) => {
            console.log(`Estrutura da planta ${index + 1} (${plant.specificEpithet}):`, JSON.stringify(plant, null, 2).substring(0, 500) + "...");
          });
        }
        
        setAllImages(all);
        setFilteredImages(all);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
      });
  }, []);

  // ---------- Controle do modal ----------
  const closeModal = () => setModalIndex(null);
  const showPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalIndex((prev) => (prev! > 0 ? prev! - 1 : filteredImages.length - 1));
  };
  const showNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalIndex((prev) => (prev! < filteredImages.length - 1 ? prev! + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredImages.length]);

  // aplicar filtros às plantas E às imagens
  useEffect(() => {
    const activeFilters = filters.filter(f => f.enabled);

    if (activeFilters.length === 0) {
      setFilteredPlants(plants);
      setFilteredImages(allImages);
      return;
    }

    const filtered = plants.filter((p) =>
      activeFilters.every((f) => {
        if (f.mode === "property_value") {
          const value = getByPath(p, f.path);
          if (value === null || value === undefined) return false;
          if (Array.isArray(value)) {
            return value.some(item => compareValues(item, f.value));
          }
          return compareValues(value, f.value);
        } else if (f.mode === "property") {
          return getByPath(p, f.path) !== undefined;
        }
        return true;
      })
    );

    setFilteredPlants(filtered);
    const filteredImgs = filterImages(filtered, activeFilters);
    setFilteredImages(filteredImgs);

  }, [filters, plants, allImages]);

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
    setOpenPropertySearch(null);
  };

  // Filtros para cada modo
  const filteredAllPaths = pathData.allPaths.filter((path) =>
    path.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const filteredValuePaths = pathData.valuePaths.filter((sp) =>
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
              const selectedValuePath = pathData.valuePaths.find((sp) => sp.path === f.path);
              const valueOptions = selectedValuePath?.options || [];

              return (
                <div
                  key={i}
                  className={`border border-border p-3 rounded-lg space-y-2 ${
                    f.enabled ? "bg-card" : "bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
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
                        onValueChange={(v: any) =>
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

                  {f.mode === "property" ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Search property path</p>

                      <Select
                        open={openPropertySearch === i}
                        onOpenChange={(open: any) => setOpenPropertySearch(open ? i : null)}
                        value={f.path}
                        onValueChange={(value: any) => handlePropertyInputChange(i, value)}
                      >
                        <SelectTrigger className="w-full text-sm">
                          <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            <SelectValue>
                              {f.path || "Search property path..."}
                            </SelectValue>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-auto">
                          <div className="p-1">
                            <Command>
                              <CommandInput
                                placeholder="Search property..."
                                className="h-9"
                                value={propertySearch}
                                onValueChange={(value: any) => setPropertySearch(value)}
                              />
                              <CommandList className="max-h-[240px]">
                                <CommandEmpty>No matching fields.</CommandEmpty>
                                <CommandGroup>
                                  {filteredAllPaths.map((path) => (
                                    <CommandItem
                                      key={path}
                                      value={path}
                                      onSelect={(currentValue: any) => {
                                        handlePropertyInputChange(i, currentValue);
                                      }}
                                      className="text-xs py-1"
                                    >
                                      {path}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                        </SelectContent>
                      </Select>

                      {f.path && (
                        <p className="text-xs text-muted-foreground">
                          Filtering by property path: <span className="font-medium">"{f.path}"</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Search property and value</p>

                      <Select
                        open={openPropertySelect === i}
                        onOpenChange={(open: any) => setOpenPropertySelect(open ? i : null)}
                        value={f.path}
                        onValueChange={(value: any) => updateFilter(i, "path", value)}
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
                                value={propertySearch}
                                onValueChange={(value: any) => setPropertySearch(value)}
                              />
                              <CommandList className="max-h-[240px]">
                                <CommandEmpty>No matching fields.</CommandEmpty>
                                <CommandGroup>
                                  {filteredValuePaths.map((sp) => (
                                    <CommandItem
                                      key={sp.path}
                                      value={sp.path}
                                      onSelect={(currentValue: any) => {
                                        updateFilter(i, "path", currentValue);
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

                      {f.path && (
                        <Select
                          onValueChange={(value: any) =>
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
              ? `Showing ${filteredPlants.length} taxa and ${filteredImages.length} images matching active filters.`
              : filters.length
                ? "All filters are disabled. Showing all taxa and images."
                : "Add filters to narrow down taxa and images."}
          </p>
        </main>

        {/* Painel direito com imagens FILTRADAS */}
        <ScrollArea className="border-l border-border flex-1 overflow-auto p-4 dark-scrollbar">
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>Images ({filteredImages.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredImages.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">No images found.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {allImages.length === 0 
                      ? "No images available in the dataset." 
                      : "No images match the current filters."}
                  </p>
                </div>
              ) : (
                filteredImages.map((img, idx) => (
                  <div key={idx} className="space-y-2 p-3 border rounded-lg bg-muted/10">
                    <p className="text-sm text-primary italic text-center font-medium">
                      Mimosa {img.specificEpithet}
                    </p>
                    <p
                      className="text-xs text-muted-foreground font-mono whitespace-normal break-words bg-muted p-1 rounded"
                      title={img.path}
                    >
                      {renderPathGrouped(img.path, 3)}
                    </p>
                    <div
                      className="bg-muted rounded overflow-hidden cursor-pointer flex justify-center hover:opacity-90 transition-opacity min-h-[150px] items-center"
                      onClick={() => setModalIndex(idx)}
                    >
                      <Image
                        src={img.url}
                        alt={img.legend || `Image of Mimosa ${img.specificEpithet}`}
                        width={260}
                        height={180}
                        className="rounded-md border border-border object-contain max-h-48"
                        loading="eager"
                        priority={idx < 3}
                        onError={(e) => {
                          console.error("Erro ao carregar imagem:", img.url);
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-32 flex items-center justify-center bg-red-50 border border-red-200 rounded">
                                <span class="text-red-500 text-sm">Failed to load image</span>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                    {img.legend && (
                      <p className="text-xs text-muted-foreground italic text-center">
                        {img.legend}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </ScrollArea>
      </div>

      {/* 🖼️ Modal de imagem */}
      {modalIndex !== null && filteredImages[modalIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-6 text-white text-3xl font-light hover:text-primary transition z-10"
          >
            ×
          </button>

          <button
            onClick={showPrev}
            className="absolute left-4 text-white text-5xl font-light hover:text-primary transition select-none z-10"
          >
            ‹
          </button>

          <div className="max-w-[90vw] max-h-[80vh] flex flex-col items-center">
            <Image
              src={filteredImages[modalIndex].url}
              alt={filteredImages[modalIndex].legend || `Image ${modalIndex + 1}`}
              width={1200}
              height={900}
              className="object-contain max-h-[80vh]"
              loading="eager"
              priority
              onError={(e) => {
                console.error("Erro ao carregar imagem no modal:", filteredImages[modalIndex].url);
                const target = e.currentTarget;
                target.style.display = 'none';
                const container = target.parentElement;
                if (container) {
                  container.innerHTML = `
                    <div class="w-64 h-64 flex items-center justify-center bg-red-100 border-2 border-red-300 rounded">
                      <span class="text-red-600 font-medium">Image failed to load</span>
                    </div>
                  `;
                }
              }}
            />
            {filteredImages[modalIndex].legend && (
              <p className="text-sm text-muted-foreground italic mt-2 text-center text-white">
                {filteredImages[modalIndex].legend}
              </p>
            )}
            {filteredImages[modalIndex].specificEpithet && (
              <p className="text-sm text-white italic mt-1">
                Mimosa {filteredImages[modalIndex].specificEpithet}
              </p>
            )}
          </div>

          <button
            onClick={showNext}
            className="absolute right-4 text-white text-5xl font-light hover:text-primary transition select-none z-10"
          >
            ›
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {modalIndex + 1} / {filteredImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
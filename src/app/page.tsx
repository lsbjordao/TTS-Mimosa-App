// ./src/app/page.tsx

"use client";

import { useEffect, useState } from "react";
import type { JSX } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Search,
  Settings,
  Github,
  BookOpenText,
  FileText,
  ChartPie,
  Funnel
} from "lucide-react";
import { Icon } from "@iconify/react";
import graphqlIcon from "@iconify/icons-logos/graphql";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import Link from "next/link";

const JSONGrid = dynamic(() => import("@redheadphone/react-json-grid"), {
  ssr: false,
});

// ---------- Função auxiliar CORRIGIDA: extrai imagens de imageUrl e imageUrlLegend ----------
function extractImagesWithPaths(obj: any, path: string[] = []) {
  let results: { path: string; url: string; legend?: string }[] = [];
  
  if (Array.isArray(obj)) {
    obj.forEach((item, i) =>
      results.push(...extractImagesWithPaths(item, [...path, `[${i}]`]))
    );
  } else if (typeof obj === "object" && obj !== null) {
    // Verifica se este objeto tem imageUrl
    if (obj.imageUrl && typeof obj.imageUrl === "string") {
      const url = obj.imageUrl;
      const legend = obj.imageUrlLegend || undefined;
      
      if (url) {
        results.push({ 
          path: path.join(".") || "root", 
          url, 
          legend 
        });
      }
    }
    
    // Continua procurando em outras propriedades recursivamente
    for (const [key, value] of Object.entries(obj)) {
      results.push(...extractImagesWithPaths(value, [...path, key]));
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

// ---------- Busca recursiva ----------
function searchInJSON(
  obj: any,
  term: string,
  options: { searchKeys: boolean; searchValues: boolean },
  path: string[] = []
): { path: string; value: string }[] {
  if (!term) return [];
  const results: { path: string; value: string }[] = [];

  if (typeof obj === "object" && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (options.searchKeys && key.toLowerCase().includes(term.toLowerCase())) {
        results.push({ path: [...path, key].join("."), value: "(key match)" });
      }

      if (
        options.searchValues &&
        typeof value === "string" &&
        value.toLowerCase().includes(term.toLowerCase())
      ) {
        results.push({ path: [...path, key].join("."), value });
      }

      results.push(...searchInJSON(value, term, options, [...path, key]));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) =>
      results.push(...searchInJSON(item, term, options, [...path, `[${i}]`]))
    );
  }

  return results;
}

export default function Home() {
  const [plants, setPlants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    { path: string; value: string; specificEpithet?: string }[]
  >([]);

  const [maxResults, setMaxResults] = useState(20);
  const [searchOptions, setSearchOptions] = useState({
    searchKeys: true,
    searchValues: true,
  });

  const [allImages, setAllImages] = useState<
    { path: string; url: string; legend?: string; specificEpithet?: string }[]
  >([]);

  // ---------- Carrega dados ----------
  useEffect(() => {
    fetch("/TTS-Mimosa-App/data/MimosaDB.json")
      .then((res) => res.json())
      .then((data) => {
        setPlants(data);

        // Extrai todas as imagens globais
        const all = data.flatMap((plant: any) =>
          extractImagesWithPaths(plant).map((img) => ({
            ...img,
            specificEpithet: plant.specificEpithet,
          }))
        );
        setAllImages(all);
        
        // Log para debug (remover depois)
        console.log("Total de plantas:", data.length);
        console.log("Total de imagens encontradas:", all.length);
        if (all.length > 0) {
          console.log("Primeiras 3 imagens:", all.slice(0, 3));
        }
      })
      .catch((error) => {
        console.error("Error loading data:", error);
      });
  }, []);

  // ---------- Atualiza busca ----------
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const results: { path: string; value: string; specificEpithet?: string }[] =
      [];
    for (const plant of plants) {
      const hits = searchInJSON(plant, searchTerm, searchOptions);
      hits.forEach((h) =>
        results.push({ ...h, specificEpithet: plant.specificEpithet })
      );
    }
    setSearchResults(results.slice(0, maxResults));
  }, [searchTerm, plants, maxResults, searchOptions]);

  const images: any = selected ? extractImagesWithPaths(selected) : allImages;

  // ---------- Controle do modal ----------
  const closeModal = () => setModalIndex(null);
  const showPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
  };
  const showNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length]);

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      {/* 🔍 Cabeçalho */}
      <header className="border-b border-border bg-card p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <b
            onClick={() => {
              setSelected(null);
              setModalIndex(null);
              setSearchTerm("");
              setSearchResults([]);
            }}
            className="cursor-pointer transition duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            title="Reload home view"
          >
            TTS-Mimosa
          </b>
          <a
            href="https://doi.org/10.1093/biomethods/bpae017"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
            title="Foundational paper"
          >
            <FileText className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </a>
          <a
            href="https://github.com/lsbjordao/TTS-Mimosa"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
            title="GitHub Repository"
          >
            <Github className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </a>
          <a
            href="https://lsbjordao.github.io/TTS-Mimosa/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
            title="Docs"
          >
            <BookOpenText className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </a>

          <Link
            href="/analytics"
            rel="noopener noreferrer"
            className="flex items-center"
            title="Analytics"
          >
            <ChartPie className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </Link>

          <Link
            href="/filter"
            rel="noopener noreferrer"
            className="flex items-center"
            title="Filter"
          >
            <Funnel className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </Link>

          {/* <Link
            href="/graphql"
            rel="noopener noreferrer"
            className="flex items-center"
            title="Graphql"
          >
            <Icon icon={graphqlIcon} color="currentColor" className="w-5 h-5 text-muted-foreground hover:text-primary transition" />
          </Link> */}

          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search within the entire JSON..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-md hover:bg-muted transition"
                title="Search settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="flex flex-col gap-3">
                <h4 className="font-medium text-sm mb-1">Search settings</h4>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Result limit:</label>
                  <select
                    aria-label="Limite de resultados"
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="border rounded-md p-1 bg-background text-foreground"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20 (default)</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>Max</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs text-muted-foreground">Search in:</label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={searchOptions.searchKeys}
                      onChange={(e) =>
                        setSearchOptions((prev) => ({
                          ...prev,
                          searchKeys: e.target.checked,
                        }))
                      }
                    />
                    Keys
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={searchOptions.searchValues}
                      onChange={(e) =>
                        setSearchOptions((prev) => ({
                          ...prev,
                          searchValues: e.target.checked,
                        }))
                      }
                    />
                    Values
                  </label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Resultados da busca */}
        {searchResults.length > 0 && (
          <div className="border border-border rounded-md bg-background mt-1 max-h-48 overflow-auto">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  const match = plants.find(
                    (p) => p.specificEpithet === r.specificEpithet
                  );
                  setSelected(match || null);
                  setSearchTerm("");
                  setSearchResults([]);
                }}
                className="w-full text-left px-2 py-1 hover:bg-muted border-b border-border last:border-none flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-mono break-words text-primary">
                    {r.path}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.value}
                  </p>
                </div>
                <span className="text-xs font-semibold text-right text-foreground ml-2">
                  {"Mimosa " + r.specificEpithet}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 🧩 Corpo principal */}
      <div className="grid grid-cols-[250px_1fr_300px] flex-1 w-full overflow-hidden">
        {/* Sidebar esquerda */}
        <ScrollArea className="border-r border-border p-3 h-full overflow-auto dark-scrollbar">
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>Taxon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {plants.map((p, i) => (
                <button
                  key={i}
                  className={`w-full text-left px-2 py-1 rounded hover:bg-muted ${
                    selected?.specificEpithet === p.specificEpithet
                      ? "bg-muted"
                      : ""
                  }`}
                  onClick={() => setSelected(p)}
                >
                  <i>Mimosa {p.specificEpithet || "sp."}</i>
                </button>
              ))}
            </CardContent>
          </Card>
        </ScrollArea>

        {/* Painel central */}
        <main className="p-3 h-full overflow-auto dark-scrollbar bg-background relative">
          {selected ? (
            <Card className="bg-card text-card-foreground min-w-full">
              <CardHeader>
                <CardTitle>
                  <i>Mimosa {selected.specificEpithet}</i>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto dark-scrollbar max-h-[calc(100vh-185px)]">
                <div className="inline-block min-w-max">
                  <JSONGrid data={selected} defaultExpandDepth={Infinity} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground text-center">
                Select a taxon on left
              </p>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Image
                  src="/TTS-Mimosa-App/tts.png"
                  alt="TypeTaxonScript Logo"
                  width={80}
                  height={80}
                  className="w-auto h-20 opacity-30"
                  priority
                />
              </div>
            </>
          )}
        </main>

        {/* Painel direito */}
        <ScrollArea className="border-l border-border p-3 h-full overflow-auto dark-scrollbar">
          <Card className="bg-card text-card-foreground w-full max-w-full box-border">
            <CardHeader>
              <CardTitle>Images ({images.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length > 0 ? (
                images.map((img: any, idx: any) => (
                  <div key={idx} className="space-y-2 p-2 border rounded-lg bg-muted/10">
                    {!selected && img.specificEpithet && (
                      <p className="text-xs text-primary text-center font-medium">
                        <i>Mimosa {img.specificEpithet}</i>
                      </p>
                    )}
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
                        alt={img.legend || `Image ${idx + 1}`}
                        width={280}
                        height={200}
                        className="h-auto max-h-48 object-contain"
                        loading="eager"
                        priority={idx < 3}
                        onError={(e) => {
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
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">No images found.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plants.length > 0 ? "Select a taxon to see images" : "Loading data..."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollArea>
      </div>

      {/* 🖼️ Modal de imagem */}
      {modalIndex !== null && images[modalIndex] && (
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
              src={images[modalIndex].url}
              alt={images[modalIndex].legend || `Image ${modalIndex + 1}`}
              width={1200}
              height={900}
              className="object-contain max-h-[80vh]"
              loading="eager"
              priority
              onError={(e) => {
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
            {images[modalIndex].legend && (
              <p className="text-sm text-muted-foreground italic mt-2 text-center text-white">
                {images[modalIndex].legend}
              </p>
            )}
            {images[modalIndex].specificEpithet && !selected && (
              <p className="text-sm text-white italic mt-1">
                Mimosa {images[modalIndex].specificEpithet}
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
            {modalIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
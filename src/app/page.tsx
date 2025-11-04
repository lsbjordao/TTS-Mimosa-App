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
  ChartPie
} from "lucide-react";

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

// ---------- Função auxiliar: extrai imagens ----------
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
          <Link
            href="/"
            className="cursor-pointer transition duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          >
            TTS-Mimosa
          </Link>
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
                  <label className="text-xs text-muted-foreground">
                    Result limit:
                  </label>
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
                  className={`w-full text-left px-2 py-1 rounded hover:bg-muted ${selected?.specificEpithet === p.specificEpithet
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
                  className="w-auto h-20 opacity-30"
                />
              </div>
            </>
          )}
        </main>

        {/* Painel direito */}
        <ScrollArea className="border-l border-border p-3 h-full overflow-auto dark-scrollbar">
          <Card className="bg-card text-card-foreground w-full max-w-full box-border">
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length > 0 ? (
                images.map((img: any, idx: any) => (
                  <div key={idx} className="space-y-1">
                    {!selected && img.specificEpithet && (
                      <p className="text-xs text-primary text-center">
                        <i>Mimosa {img.specificEpithet}</i>
                      </p>
                    )}
                    <p
                      className="text-sm text-muted-foreground font-mono whitespace-normal break-words"
                      title={img.path}
                    >
                      {renderPathGrouped(img.path, 3)}
                    </p>
                    <div
                      className="bg-muted rounded overflow-hidden cursor-pointer flex justify-center"
                      onClick={() => setModalIndex(idx)}
                    >
                      <Image
                        src={img.url}
                        alt={`Imagem ${idx + 1}`}
                        width={800}
                        height={600}
                        className="h-auto object-contain"
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
                <p className="text-muted-foreground">None found.</p>
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
            className="absolute top-4 right-6 text-white text-3xl font-light hover:text-primary transition"
          >
            ×
          </button>

          <button
            onClick={showPrev}
            className="absolute left-4 text-white text-5xl font-light hover:text-primary transition select-none"
          >
            ‹
          </button>

          <div className="max-w-[90vw] max-h-[80vh] flex flex-col items-center">
            <Image
              src={images[modalIndex].url}
              alt={`Imagem ${modalIndex + 1}`}
              width={1200}
              height={900}
              className="object-contain max-h-[80vh]"
            />
            {images[modalIndex].legend && (
              <p className="text-sm text-muted-foreground italic mt-2 text-center text-white">
                {images[modalIndex].legend}
              </p>
            )}
          </div>

          <button
            onClick={showNext}
            className="absolute right-4 text-white text-5xl font-light hover:text-primary transition select-none"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

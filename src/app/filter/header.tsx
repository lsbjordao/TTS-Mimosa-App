// ./src/app/filter/header.tsx

"use client";

import Link from "next/link";
import { Settings, Github, BookOpenText, FileText, ChartPie, Funnel } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function Header() {
  return (
    <header className="border-b border-border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="cursor-pointer transition duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        >
          <b>TTS-Mimosa</b>
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
          className="flex items-center justify-center hover:text-primary transition-colors"
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
          <Funnel className="w-5 h-5 text-muted-foreground" />
        </Link>
        
        <div className="ml-auto flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-md hover:bg-muted transition"
                title="Configurações"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <p className="text-sm text-muted-foreground">
                Nenhuma configuração disponível ainda.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

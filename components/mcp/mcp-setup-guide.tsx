"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FolderOpen,
  Plug,
  Terminal,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getClientConfig,
  getGrokCliCommand,
  type McpClientId,
  type McpSetupConfig,
  normalizeRepoPath,
} from "@/lib/mcp/setup";
import { cn } from "@/lib/utils";

type McpSetupGuideProps = {
  config: McpSetupConfig;
};

async function copyText(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied to clipboard`);
}

export function McpSetupGuide({ config }: McpSetupGuideProps) {
  const [repoPath, setRepoPath] = useState(config.defaultRepoPath);
  const [activeClient, setActiveClient] = useState<McpClientId>("grok");

  const normalizedPath = useMemo(() => normalizeRepoPath(repoPath), [repoPath]);
  const activeGuide = config.clients.find((client) => client.id === activeClient)!;
  const clientConfig = useMemo(
    () => getClientConfig(activeClient, config, normalizedPath),
    [activeClient, config, normalizedPath],
  );
  const grokCli = useMemo(() => getGrokCliCommand(config, normalizedPath), [config, normalizedPath]);

  const prerequisites = [
    { done: true, label: "Node.js 20+ installed" },
    { label: "npm run mcp:install && npm run mcp:build" },
    { label: "npm run engine:up (engine on port " + config.enginePort + ")" },
    { label: `Engine healthy at ${config.engineUrl}/health` },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/8 bg-card/60 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Plug className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">MCP</Badge>
              <Badge variant="secondary">stdio</Badge>
              <Badge variant="outline">Port {config.enginePort}</Badge>
            </div>
            <h2 className="text-xl font-semibold">Connect your AI agent</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Let Grok, Antigravity, VS Code, Cursor, or Claude Desktop validate and run{" "}
              {config.productName} tools locally. Copy the generated config for your install path —
              no manual editing of ABSOLUTE_PATH_TO_REPO.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/8 bg-secondary/30 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Prerequisites
            </h3>
            <ol className="mt-4 space-y-3">
              {prerequisites.map((item, index) => (
                <li key={item.label} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/60 text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className={cn(item.done && "text-foreground")}>{item.label}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-white/8 bg-background/40 p-3 font-mono text-xs text-muted-foreground">
              npm run mcp:install{"\n"}npm run mcp:build{"\n"}npm run engine:up
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-secondary/30 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FolderOpen className="h-4 w-4 text-accent" />
              Your install path
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Set where {config.productName} lives on your machine. Configs below update
              automatically. Use forward slashes on Windows.
            </p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="repoPath" className="text-xs text-muted-foreground">
                Repository folder
              </Label>
              <Input
                id="repoPath"
                value={repoPath}
                onChange={(event) => setRepoPath(event.target.value)}
                className="font-mono text-sm"
                placeholder={config.defaultRepoPath}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-secondary/30 p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-accent" />
              Available tools
            </h3>
            <ul className="mt-4 space-y-3">
              {config.tools.map((tool) => (
                <li key={tool.name} className="rounded-lg border border-white/8 bg-background/30 p-3">
                  <p className="font-mono text-xs text-primary">{tool.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config.clients.map((client) => (
              <Button
                key={client.id}
                type="button"
                size="sm"
                variant={activeClient === client.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setActiveClient(client.id)}
              >
                {client.label}
              </Button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/8 bg-card/60 p-5 backdrop-blur-sm">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{activeGuide.label}</h3>
              <p className="font-mono text-xs text-muted-foreground">{activeGuide.configPath}</p>
              {activeGuide.configPathNote ? (
                <p className="text-xs text-muted-foreground">{activeGuide.configPathNote}</p>
              ) : null}
            </div>

            <ol className="mt-5 space-y-2">
              {activeGuide.steps.map((step, index) => (
                <li key={step} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 font-medium text-foreground">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {activeClient === "grok" ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Or use CLI</p>
                <div className="flex gap-2">
                  <pre className="max-h-24 flex-1 overflow-auto rounded-lg border border-white/8 bg-background/60 p-3 font-mono text-[11px] text-muted-foreground">
                    {grokCli}
                  </pre>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0 cursor-pointer"
                    onClick={() => copyText(grokCli, "Grok CLI command")}
                  >
                    <ClipboardCopy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {activeClient === "vscode" ? (
              <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                <strong>Already in this repo:</strong> open the project folder and VS Code picks up{" "}
                <code className="text-emerald-100">.vscode/mcp.json</code> with{" "}
                <code className="text-emerald-100">${"{"}workspaceFolder{"}"}</code> — no path edit needed.
              </div>
            ) : null}

            {activeClient === "cursor" ? (
              <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                <strong>Already in this repo:</strong> <code className="text-emerald-100">.cursor/mcp.json</code>{" "}
                uses a relative path to <code className="text-emerald-100">mcp-server/dist/index.js</code>.
              </div>
            ) : null}

            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  Config to paste
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => copyText(clientConfig, `${activeGuide.label} config`)}
                >
                  <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                  Copy config
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded-xl border border-white/8 bg-background/70 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {clientConfig}
              </pre>
            </div>

            <div className="mt-5 rounded-lg border border-white/8 bg-background/40 p-4">
              <p className="text-xs font-medium text-muted-foreground">Example prompt for your agent</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{config.examplePrompt}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2 h-8 cursor-pointer px-2 text-xs"
                onClick={() => copyText(config.examplePrompt, "Example prompt")}
              >
                <ClipboardCopy className="mr-1.5 h-3 w-3" />
                Copy prompt
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-secondary/30 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Wrench className="h-4 w-4 text-amber-400" />
          Troubleshooting
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {config.troubleshoot.map((item) => (
            <div key={item.problem} className="rounded-lg border border-white/8 bg-background/30 p-4">
              <p className="text-sm font-medium">{item.problem}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.fix}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Full reference:{" "}
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            mcp-server/MCP_SETUP.md
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </section>
    </div>
  );
}
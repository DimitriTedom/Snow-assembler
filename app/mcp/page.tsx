import Link from "next/link";
import { ArrowLeft, Plug } from "lucide-react";

import { McpSetupGuide } from "@/components/mcp/mcp-setup-guide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ASSEMBLER_MCP_SETUP } from "@/lib/mcp/setup";

export const metadata = {
  title: "MCP Setup",
  description: "Connect Grok, Antigravity, VS Code, Cursor, and Claude Desktop to Snow Assembler.",
};

export default function McpSetupPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 cursor-pointer px-2 text-muted-foreground">
          <Link href="/assembler">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Workspace
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="gap-1">
            <Plug className="h-3 w-3" />
            Agent setup
          </Badge>
          <Badge variant="secondary">Grok · Antigravity · VS Code · Cursor · Claude</Badge>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Connect your <span className="text-primary">AI via MCP</span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Step-by-step configs for each client. Paste your repo path, copy the generated block, and
          your agent can validate and assemble Zenn episodes without touching the web UI.
        </p>
      </div>

      <McpSetupGuide config={ASSEMBLER_MCP_SETUP} />
    </div>
  );
}
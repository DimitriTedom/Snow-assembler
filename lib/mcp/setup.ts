export type McpClientId = "grok" | "antigravity" | "vscode" | "cursor" | "claude";

export type McpToolInfo = {
  name: string;
  description: string;
};

export type McpClientGuide = {
  id: McpClientId;
  label: string;
  configPath: string;
  configPathNote?: string;
  steps: string[];
};

export type McpSetupConfig = {
  productName: string;
  serverName: string;
  enginePort: number;
  engineEnvVar: string;
  engineUrl: string;
  defaultRepoPath: string;
  docsUrl: string;
  tools: McpToolInfo[];
  clients: McpClientGuide[];
  examplePrompt: string;
  troubleshoot: Array<{ problem: string; fix: string }>;
};

export const ASSEMBLER_MCP_SETUP: McpSetupConfig = {
  productName: "Snow Assembler",
  serverName: "snow-assembler",
  enginePort: 8001,
  engineEnvVar: "ASSEMBLER_ENGINE_URL",
  engineUrl: "http://localhost:8001",
  defaultRepoPath: "D:/SnowDev/Videos/Youtube/CRAVE & CONQUER/Snow-assembler",
  docsUrl: "https://github.com/DimitriTedom/Snow-assembler/blob/main/mcp-server/MCP_SETUP.md",
  tools: [
    { name: "snow_assembler_engine_health", description: "Check if the FFmpeg engine is online" },
    { name: "snow_assembler_validate_project", description: "Match batch images to scene timestamps" },
    { name: "snow_assembler_assemble_images", description: "Render assembled.mp4 from an episode folder" },
  ],
  clients: [
    {
      id: "grok",
      label: "Grok",
      configPath: "~/.grok/config.toml",
      configPathNote: "Or .grok/config.toml in your project for team sharing",
      steps: [
        "Build the MCP server: npm run mcp:install && npm run mcp:build",
        "Start the engine: npm run engine:up",
        "Paste the TOML block below into ~/.grok/config.toml",
        "Run grok mcp doctor snow-assembler to verify connectivity",
        "Ask Grok to run snow_assembler_validate_project on your episode folder",
      ],
    },
    {
      id: "antigravity",
      label: "Antigravity / Gemini CLI",
      configPath: "~/.gemini/config/mcp_config.json",
      steps: [
        "Build the MCP server: npm run mcp:install && npm run mcp:build",
        "Start the engine: npm run engine:up",
        "Merge the JSON block into ~/.gemini/config/mcp_config.json",
        "Restart Antigravity IDE or Antigravity CLI",
        "Ask the agent: What MCP servers do we have?",
      ],
    },
    {
      id: "vscode",
      label: "VS Code",
      configPath: ".vscode/mcp.json (workspace) or user MCP config",
      configPathNote: "Command Palette → MCP: Open Workspace Folder Configuration",
      steps: [
        "Build the MCP server: npm run mcp:install && npm run mcp:build",
        "Start the engine: npm run engine:up",
        "This repo already includes .vscode/mcp.json — open the project folder in VS Code",
        "Trust and start the MCP server when prompted",
        "Use Chat → Configure Tools to enable snow-assembler tools",
      ],
    },
    {
      id: "cursor",
      label: "Cursor",
      configPath: ".cursor/mcp.json",
      steps: [
        "Build the MCP server: npm run mcp:install && npm run mcp:build",
        "Start the engine: npm run engine:up",
        "Enable MCP in Cursor settings (project uses .cursor/mcp.json)",
        "Restart Cursor if tools do not appear",
        "Ask the agent to validate or assemble your Zenn episode",
      ],
    },
    {
      id: "claude",
      label: "Claude Desktop",
      configPath: "%APPDATA%\\Claude\\claude_desktop_config.json",
      configPathNote: "macOS: ~/Library/Application Support/Claude/claude_desktop_config.json",
      steps: [
        "Build the MCP server: npm run mcp:install && npm run mcp:build",
        "Start the engine: npm run engine:up",
        "Merge the mcpServers block into claude_desktop_config.json",
        "Fully quit and reopen Claude Desktop",
        "Look for snow-assembler tools in the connector panel",
      ],
    },
  ],
  examplePrompt:
    'Validate my episode at C:/Users/Dimitri SnowDev/Documents/Zenn/episodes/why_you_cant_stop_scrolling with snow_assembler_validate_project (use_docker_paths: true, image_naming: sequential), then assemble if all scenes match.',
  troubleshoot: [
    { problem: "Tools not listed", fix: "Run npm run mcp:build and confirm mcp-server/dist/index.js exists" },
    { problem: "Engine offline", fix: "npm run engine:up then open http://localhost:8001/health" },
    { problem: "Path not found in Docker", fix: "Use use_docker_paths: true and keep episodes under Documents/Zenn" },
    { problem: "Windows & in folder path", fix: "MCP uses node directly — OK. Use forward slashes in configs" },
  ],
};

export function normalizeRepoPath(path: string) {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "");
}

export function buildMcpServerPath(repoPath: string) {
  return `${normalizeRepoPath(repoPath)}/mcp-server/dist/index.js`;
}

export function buildGrokConfig(config: McpSetupConfig, repoPath: string) {
  const serverPath = buildMcpServerPath(repoPath);
  return `[mcp_servers.${config.serverName}]
command = "node"
args = ["${serverPath}"]
env = { ${config.engineEnvVar} = "${config.engineUrl}" }
enabled = true`;
}

export function buildCursorConfig(config: McpSetupConfig, repoPath: string) {
  const serverPath = buildMcpServerPath(repoPath);
  return JSON.stringify(
    {
      mcpServers: {
        [config.serverName]: {
          command: "node",
          args: [serverPath],
          env: { [config.engineEnvVar]: config.engineUrl },
        },
      },
    },
    null,
    2,
  );
}

export function buildAntigravityConfig(config: McpSetupConfig, repoPath: string) {
  return buildCursorConfig(config, repoPath);
}

export function buildClaudeConfig(config: McpSetupConfig, repoPath: string) {
  return buildCursorConfig(config, repoPath);
}

export function buildVscodeConfig(config: McpSetupConfig, repoPath: string) {
  const serverPath = buildMcpServerPath(repoPath);
  return JSON.stringify(
    {
      servers: {
        [config.serverName]: {
          type: "stdio",
          command: "node",
          args: [serverPath],
          env: { [config.engineEnvVar]: config.engineUrl },
        },
      },
    },
    null,
    2,
  );
}

export function buildVscodeWorkspaceConfig(config: McpSetupConfig) {
  return JSON.stringify(
    {
      servers: {
        [config.serverName]: {
          type: "stdio",
          command: "node",
          args: ["${workspaceFolder}/mcp-server/dist/index.js"],
          env: { [config.engineEnvVar]: config.engineUrl },
        },
      },
    },
    null,
    2,
  );
}

export function getClientConfig(
  clientId: McpClientId,
  config: McpSetupConfig,
  repoPath: string,
): string {
  switch (clientId) {
    case "grok":
      return buildGrokConfig(config, repoPath);
    case "vscode":
      return buildVscodeConfig(config, repoPath);
    case "cursor":
    case "antigravity":
    case "claude":
      return buildCursorConfig(config, repoPath);
    default:
      return "";
  }
}

export function getGrokCliCommand(config: McpSetupConfig, repoPath: string) {
  const serverPath = buildMcpServerPath(repoPath);
  return `grok mcp add ${config.serverName} -e ${config.engineEnvVar}=${config.engineUrl} -- node "${serverPath}"`;
}
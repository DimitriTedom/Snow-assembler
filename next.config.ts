import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin =
  supabaseUrl && (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"))
    ? new URL(supabaseUrl).origin
    : null;

const supabaseRemotePattern =
  supabaseUrl && (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"))
    ? (() => {
        const parsed = new URL(supabaseUrl);
        return {
          protocol: parsed.protocol.replace(":", "") as "http" | "https",
          hostname: parsed.hostname,
          port: parsed.port || undefined,
          pathname: "/storage/v1/object/**",
        };
      })()
    : null;
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const isDevelopment = process.env.NODE_ENV !== "production";
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const shouldEnforceHttpsHeaders =
  process.env.NODE_ENV === "production" &&
  typeof publicSiteUrl === "string" &&
  publicSiteUrl.startsWith("https://");

const nextConfig: NextConfig = {
  /* config options here */
  // Keep standalone only for Docker/VPS self-hosting. Vercel handles output internally.
  output: isVercel ? undefined : "standalone",
  outputFileTracingRoot: process.cwd(),
  compress: true,
  poweredByHeader: false,
  async headers() {
    const connectSrc = ["'self'", "https:", "wss:"];
    if (isDevelopment) {
      connectSrc.push("http:", "ws:");
    }
    if (supabaseOrigin) {
      connectSrc.push(supabaseOrigin);
    }

    const scriptSrc = ["'self'", "'unsafe-inline'"];
    if (isDevelopment) {
      // Next.js dev runtime needs eval/WebSocket for HMR and client hydration.
      scriptSrc.push("'unsafe-eval'");
    }

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https:",
      "media-src 'self' data: blob: https: http:",
      "style-src 'self' 'unsafe-inline'",
      "worker-src 'self' blob:",
      `script-src ${scriptSrc.join(" ")}`,
      `connect-src ${connectSrc.join(" ")}`,
      ...(shouldEnforceHttpsHeaders ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-site" },
    ];

    if (shouldEnforceHttpsHeaders) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        pathname: "/storage/v1/object/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "http",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      ...(supabaseRemotePattern ? [supabaseRemotePattern] : []),
    ],
  },

  experimental: {
    // Workaround for intermittent missing server chunks during production builds.
    webpackBuildWorker: false,
    // Enable Server Actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

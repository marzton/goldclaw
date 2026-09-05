const DEFAULT_ACCESS_TEAM_DOMAIN = "goldshore.cloudflareaccess.com";
const DEFAULT_ACCESS_CLIENT_ID =
  "95aa2409100eea09257ab2d3a41451fe8407db48493840686e6077e3444610b4";

const CORTEX_HOSTS = new Set([
  "cortex.goldshore.ai",
  "preview.cortex.goldshore.ai",
]);

function cortexConfig(env = {}) {
  const environment = env.CORTEX_ENVIRONMENT ?? "production";
  return {
    mode: "cloud",
    environment,
    actionGateway: {
      available: false,
      reason: "No authenticated CLAW device gateway is connected to this cloud surface.",
    },
    devices: [{ id: "CLAW-HP", label: "CLAW-HP", status: "offline" }],
    repositories: [{ id: "REPO-GOLDCLAW", label: "Goldclaw", status: "registered" }],
    tasks: [{ id: "GSC-0003A", label: "Cortex Command Surface vertical slice" }],
    agents: [
      { id: "codex", label: "Codex", status: "requires-device-gateway" },
      { id: "claude", label: "Claude Code", status: "requires-device-gateway" },
    ],
    context: {
      files: ["FOUNDATIONS.md", "CANON.md", "REGISTRY.yaml", "docs/HANDOFF.md"],
      skills: ["goldshore-platform-operations", "task-planner"],
      plugins: [],
    },
  };
}

async function handleCortex(request, env, url) {
  if (url.pathname === "/health" || url.pathname === "/api/status") {
    return Response.json({
      ok: true,
      service: "gold-shore-cortex",
      environment: env.CORTEX_ENVIRONMENT ?? "production",
      mode: "cloud-read-only",
      action_gateway: "disconnected",
      repository: "marzton/goldclaw",
    });
  }

  if (url.pathname === "/api/config" && request.method === "GET") {
    return Response.json(cortexConfig(env));
  }

  if (url.pathname === "/api/runs" && request.method === "GET") {
    return Response.json([]);
  }

  if (url.pathname.startsWith("/api/runs") && request.method !== "GET") {
    return Response.json(
      {
        error: "Cloud dispatch is disabled until an authenticated CLAW device gateway is registered.",
        code: "ACTION_GATEWAY_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  if (!env.ASSETS) {
    return Response.json(
      { error: "Cortex assets binding is unavailable", code: "ASSETS_UNAVAILABLE" },
      { status: 503 },
    );
  }

  return env.ASSETS.fetch(request);
}

function buildMetadata(request) {
  const { origin } = new URL(request.url);

  return {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["openid", "email", "profile"],
  };
}

function buildProtectedResourceMetadata(request) {
  const { origin } = new URL(request.url);

  return {
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ["openid", "email", "profile"],
    bearer_methods_supported: ["header"],
    resource_name: "GoldShore MCP Portal",
  };
}

function buildAccessAuthorizationUrl(request, env = {}) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? `${url.origin}/callback`;
  const scope = url.searchParams.get("scope") ?? "openid email profile";

  if (request.headers.get("x-debug-disable-access") === "1") {
    return null;
  }

  const directAuthorizationUrl =
    env.ACCESS_AUTHORIZATION_URL ?? url.searchParams.get("access_authorization_url");
  if (directAuthorizationUrl) {
    const accessUrl = new URL(directAuthorizationUrl);
    accessUrl.searchParams.set("response_type", "code");
    accessUrl.searchParams.set("redirect_uri", redirectUri);
    accessUrl.searchParams.set("scope", scope);
    if (state) accessUrl.searchParams.set("state", state);
    return accessUrl;
  }

  const teamDomain =
    env.ACCESS_TEAM_DOMAIN ?? url.searchParams.get("access_team_domain") ?? DEFAULT_ACCESS_TEAM_DOMAIN;
  const clientId =
    env.ACCESS_CLIENT_ID ?? url.searchParams.get("access_client_id") ?? DEFAULT_ACCESS_CLIENT_ID;

  const accessUrl = new URL(
    `https://${teamDomain}/cdn-cgi/access/sso/oidc/${clientId}/authorization`,
  );
  accessUrl.searchParams.set("response_type", "code");
  accessUrl.searchParams.set("redirect_uri", redirectUri);
  accessUrl.searchParams.set("scope", scope);
  if (state) accessUrl.searchParams.set("state", state);
  return accessUrl;
}

function oauthUnavailable(message) {
  return Response.json(
    {
      service: "goldclaw",
      status: "oauth_not_configured",
      message,
    },
    { status: 501 },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (CORTEX_HOSTS.has(url.hostname)) {
      return handleCortex(request, env, url);
    }

    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        service: "goldclaw",
        status: "ok",
        repository: "marzton/goldclaw",
        routes: [
          "/.well-known/oauth-authorization-server",
          "/authorize",
          "/callback",
          "/register",
          "/token",
          "/mcp",
        ],
      });
    }

    if (url.pathname === "/.well-known/oauth-authorization-server") {
      return Response.json(buildMetadata(request));
    }

    if (url.pathname === "/.well-known/oauth-protected-resource") {
      return Response.json(buildProtectedResourceMetadata(request));
    }

    if (url.pathname === "/authorize") {
      const accessUrl = buildAccessAuthorizationUrl(request, env);
      return Response.redirect(accessUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      return Response.json({
        service: "goldclaw",
        status: "oauth_callback_reached",
        code_present: url.searchParams.has("code"),
        state_present: url.searchParams.has("state"),
      });
    }

    if (url.pathname === "/token" || url.pathname === "/register") {
      return oauthUnavailable(
        `${url.pathname} is reserved for the OAuth provider wrapper and will be enabled once the MCP auth flow is fully wired.`,
      );
    }

    if (url.pathname === "/mcp") {
      return oauthUnavailable(
        "The MCP transport is not yet wired into this worker. The missing /authorize and /callback paths have been restored first so clients stop 404ing during discovery.",
      );
    }

    return Response.json(
      {
        error: "not_found",
        service: "goldclaw",
      },
      { status: 404 },
    );
  },
};

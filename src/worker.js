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

  const teamDomain = env.ACCESS_TEAM_DOMAIN ?? url.searchParams.get("access_team_domain") ?? "goldshore.cloudflareaccess.com";
  const clientId = env.ACCESS_CLIENT_ID ?? url.searchParams.get("access_client_id");
  if (!clientId) return null;

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

    if (url.pathname === "/authorize") {
      const accessUrl = buildAccessAuthorizationUrl(request, env);
      if (!accessUrl) {
        return oauthUnavailable(
          "Set access_authorization_url or access_client_id in the request while the Cloudflare Access OAuth wiring is being finalized.",
        );
      }
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

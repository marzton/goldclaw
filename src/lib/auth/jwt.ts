// Consolidated from goldshore-api/src/index.ts
// JWT verification and claims handling

export interface JwtClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  scope?: string;
  [key: string]: unknown;
}

function base64UrlToUint8Array(segment: string): Uint8Array {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = normalized + (padding === 0 ? "" : "=".repeat(4 - padding));
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtPayload(segment: string): JwtClaims {
  const json = new TextDecoder().decode(base64UrlToUint8Array(segment));
  return JSON.parse(json) as JwtClaims;
}

export interface JwtEnv {
  GOLDSHORE_JWT_SECRET: string;
  JWT_AUDIENCE?: string;
  JWT_ISSUER?: string;
}

export async function verifyJwt(token: string, env: JwtEnv): Promise<JwtClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(env.GOLDSHORE_JWT_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signedContent = encoder.encode(`${headerSegment}.${payloadSegment}`);
  const signature = base64UrlToUint8Array(signatureSegment);
  const signatureBuffer = signature.buffer.slice(
    signature.byteOffset,
    signature.byteOffset + signature.byteLength
  ) as ArrayBuffer;
  const dataBuffer = signedContent.buffer.slice(
    signedContent.byteOffset,
    signedContent.byteOffset + signedContent.byteLength
  ) as ArrayBuffer;

  const valid = await crypto.subtle.verify("HMAC", cryptoKey, signatureBuffer, dataBuffer);
  if (!valid) {
    throw new Error("Invalid signature");
  }

  const claims = decodeJwtPayload(payloadSegment);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (typeof claims.exp === "number" && claims.exp < nowSeconds) {
    throw new Error("Token expired");
  }

  if (typeof claims.nbf === "number" && claims.nbf > nowSeconds) {
    throw new Error("Token not yet valid");
  }

  if (env.JWT_ISSUER && claims.iss !== env.JWT_ISSUER) {
    throw new Error("Unexpected issuer");
  }

  if (env.JWT_AUDIENCE) {
    const audiences = Array.isArray(claims.aud)
      ? claims.aud
      : [claims.aud].filter((value): value is string => Boolean(value));
    if (audiences.length === 0 || !audiences.includes(env.JWT_AUDIENCE)) {
      throw new Error("Unexpected audience");
    }
  }

  return claims;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

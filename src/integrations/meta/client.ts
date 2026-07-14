// Meta Business API client
// Handles authentication, campaigns, ad accounts, webhooks

import type { MetaAdAccount, MetaCampaign, MetaConfig, MetaOAuthToken } from "./types";

const META_GRAPH_API = "https://graph.instagram.com/v18.0";
const META_GRAPH_FACEBOOK = "https://graph.facebook.com/v18.0";

export class MetaClient {
  private config: MetaConfig;
  private accessToken?: string;

  constructor(config: MetaConfig) {
    this.config = config;
    this.accessToken = config.accessToken;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaOAuthToken> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: redirectUri,
      code
    });

    const response = await fetch(`${META_GRAPH_FACEBOOK}/oauth/access_token`, {
      method: "POST",
      body: params.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!response.ok) {
      throw new Error(`Meta OAuth failed: ${response.statusText}`);
    }

    return response.json() as Promise<MetaOAuthToken>;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<MetaOAuthToken> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      fb_exchange_token: refreshToken
    });

    const response = await fetch(`${META_GRAPH_FACEBOOK}/oauth/access_token`, {
      method: "POST",
      body: params.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!response.ok) {
      throw new Error(`Meta token refresh failed: ${response.statusText}`);
    }

    const token = await response.json() as MetaOAuthToken;
    this.accessToken = token.access_token;
    return token;
  }

  /**
   * Get ad accounts under this business
   */
  async getAdAccounts(businessId?: string): Promise<MetaAdAccount[]> {
    const id = businessId || this.config.businessId;
    const url = `${META_GRAPH_FACEBOOK}/${id}/adaccounts?access_token=${this.accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get ad accounts: ${response.statusText}`);
    }

    const data = await response.json() as { data: MetaAdAccount[] };
    return data.data;
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const accountId = adAccountId.replace("act_", "");
    const url = `${META_GRAPH_FACEBOOK}/act_${accountId}/campaigns?fields=id,name,objective,status,effective_status,created_time,updated_time&access_token=${this.accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get campaigns: ${response.statusText}`);
    }

    const data = await response.json() as { data: MetaCampaign[] };
    return data.data;
  }

  /**
   * Get campaign details
   */
  async getCampaign(campaignId: string): Promise<MetaCampaign> {
    const url = `${META_GRAPH_FACEBOOK}/${campaignId}?fields=id,name,objective,status,effective_status,budget_remaining,created_time,updated_time&access_token=${this.accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get campaign: ${response.statusText}`);
    }

    return response.json() as Promise<MetaCampaign>;
  }

  /**
   * Update campaign (pause, resume, change name, etc.)
   */
  async updateCampaign(
    campaignId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    const url = `${META_GRAPH_FACEBOOK}/${campaignId}?access_token=${this.accessToken}`;

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(updates),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Failed to update campaign: ${response.statusText}`);
    }

    return response.json() as Promise<{ success: boolean }>;
  }

  /**
   * Get insights for a campaign
   */
  async getCampaignInsights(
    campaignId: string,
    params: Record<string, string> = {}
  ): Promise<unknown> {
    const searchParams = new URLSearchParams({
      ...params,
      access_token: this.accessToken || ""
    });

    const url = `${META_GRAPH_FACEBOOK}/${campaignId}/insights?${searchParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get insights: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Set access token (for when refreshed)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }
}

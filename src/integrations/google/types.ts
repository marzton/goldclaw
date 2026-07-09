// Google API types and interfaces

export interface GoogleOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  loginCustomerId: string;
  refreshToken?: string;
}

export interface GoogleAdsAccount {
  resource_name: string;
  customer_id: string;
  descriptive_name: string;
  auto_tagging_enabled: boolean;
  final_url_suffix_supported: boolean;
  manager: boolean;
}

export interface GoogleAdsCampaign {
  resource_name: string;
  id: string;
  name: string;
  status: string;
  budget_amount_micros: string;
  start_date: string;
  end_date: string;
  advertising_channel_type: string;
}

export interface GoogleSearchConsoleUrl {
  siteUrl: string;
  type: string;
}

export interface GoogleSearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GoogleSheetsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
}

export interface GoogleSheetRow {
  [key: string]: unknown;
}

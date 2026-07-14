// Meta Business API types and interfaces

export interface MetaOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface MetaBusiness {
  id: string;
  name: string;
}

export interface MetaAdAccount {
  account_id: string;
  account_status: number;
  age: number;
  amount_spent: string;
  attribution_model: string;
  balance: string;
  business_city?: string;
  business_country_code?: string;
  business_name: string;
  business_state?: string;
  business_zip?: string;
  can_create_brand_lift_study: boolean;
  capabilities: string[];
  created_time: string;
  currency: string;
  disable_reason: number;
  end_advertiser: string;
  funding_entity?: string;
  owner?: string;
  timezone_id: number;
  timezone_name: string;
  name: string;
}

export interface MetaCampaign {
  id: string;
  account_id: string;
  adset_spec?: unknown;
  bid_strategy: string;
  budget_remaining: string;
  created_time: string;
  daily_budget?: string;
  effective_status: string;
  is_budget_schedule_enabled: boolean;
  lifetime_budget?: string;
  name: string;
  objective: string;
  special_ad_category?: string;
  special_ad_category_country?: string;
  start_time?: string;
  status: string;
  stop_time?: string;
  updated_time: string;
}

export interface MetaWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      value: unknown;
      field: string;
    }>;
  }>;
}

export interface MetaConfig {
  appId: string;
  appSecret: string;
  businessId: string;
  accessToken?: string;
  refreshToken?: string;
}

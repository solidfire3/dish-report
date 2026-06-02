export type MustOrder = { item?: string; differentiator?: string; why?: string } | null;
export type AlsoTry = string | { dish?: string; note?: string } | null;

export type Restaurant = {
  name: string; rank?: number; website_domain?: string; neighborhood?: string;
  price_range?: string; venue_type?: string; dish_mentions?: number; hours?: string;
  specials?: string; experience_note?: string; what_it_is?: string; win_reason?: string;
  top_descriptors?: string[]; must_orders?: MustOrder[]; also_try?: AlsoTry[];
  food_score?: number; verdict?: string; best_quote?: string;
  warnings?: (string | null)[]; address?: string; cuisine?: string;
  confidence?: "high" | "medium" | "low";
  // Phase 2 normalization fields
  restaurant_id?: string;      // uuid from restaurants table
  dish_badge?: string | null;  // contextual label when place is celebrated for the searched dish
  // fit_adjustment / _effective_score removed — base food_score is the one displayed score
};

export type DeepDiveData = {
  name: string; neighborhood?: string; price_range?: string; venue_type?: string;
  food_score?: number; confidence?: string; website_domain?: string;
  hours?: string; specials?: string; experience_note?: string;
  must_orders?: MustOrder[]; also_try?: AlsoTry[]; skip?: (string | null)[];
  insider_tips?: (string | null)[]; vibe_tags?: string[]; verdict?: string;
  address?: string; cuisine?: string;
};

export type Vendor = {
  name?: string; specialty?: string; food_score?: number; price_range?: string;
  the_order?: string; why?: string; insider_note?: string;
};

export type MarketData = {
  market_name: string; location?: string; hours?: string; vibe?: string;
  vendors?: (Vendor | null)[];
};

export type Alternative = {
  name?: string; neighborhood?: string; cuisine?: string; venue_type?: string;
  food_score?: number; price_range?: string; verdict_vs_original?: string;
  go_here_if?: string; must_order?: string; must_order_why?: string; address?: string;
};

export type CompareData = {
  original?: { name?: string; food_score?: number };
  alternatives?: (Alternative | null)[];
  search_area?: string; _mode?: string; _originalScore?: number;
};

export type SearchMeta = { dish: string; city: string };
export type ConfirmMatch = { name: string; address?: string; city?: string; neighborhood?: string; cuisine?: string };
export type Fav = { name: string; neighborhood?: string; venue_type?: string; price_range?: string; food_score?: number };
export type NarrowQuestion = { question: string; options: string[] };

export type NavEntry = {
  phase: string; restaurants: Restaurant[]; meta: SearchMeta | null;
  searchedDish: string; deepData: DeepDiveData | null; compareData: CompareData | null;
  marketData: MarketData | null; expanded: number | null; tab: string;
};

export type UserList = { id: string; name: string };
export type AddToListTarget = {
  name: string; neighborhood?: string; venue_type?: string;
  price_range?: string; food_score?: number; cuisine?: string;
};

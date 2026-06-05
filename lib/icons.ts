/**
 * Dish Report — Semantic Icon System
 *
 * All icons use lucide-react at strokeWidth=1.5 (thin monoline).
 * Colors are assigned semantically: color reinforces the icon+label,
 * never the sole signal (accessibility-safe).
 *
 * Surface variants:
 *   _LIGHT — on bone (#e8ece8) backgrounds
 *   _DARK  — on dark-teal (#10211e) backgrounds
 */

// ─── SIZES ────────────────────────────────────────────────────────────────────
export const IC_STROKE = 1.5;   // uniform thin monoline weight
export const IC_XS  = 14;       // inside chips / inline
export const IC_SM  = 16;       // standard inline / action
export const IC_MD  = 18;       // section header / button
export const IC_LG  = 22;       // card-level / prominent

// ─── SEMANTIC COLORS — LIGHT SURFACE (bone #e8ece8) ──────────────────────────
export const IC_TEAL_L        = "#2f6b5c";   // base / default  (nav, general)
export const IC_AMBER_L       = "#b9772e";   // food halls / warmth / markets
export const IC_TERRACOTTA_L  = "#c1572f";   // trending / heat / spice
export const IC_PLUM_L        = "#7e5a86";   // explore / global / discovery

// ─── SEMANTIC COLORS — DARK SURFACE (#10211e) ────────────────────────────────
export const IC_TEAL_D        = "#7fe3c8";   // base / default
export const IC_AMBER_D       = "#d4894f";   // food halls / warmth
export const IC_TERRACOTTA_D  = "#e07b5c";   // trending / heat
export const IC_PLUM_D        = "#b38fc0";   // explore / global / discovery

// ─── SEMANTIC MAPPING (WHAT USES WHAT) ───────────────────────────────────────
// Navigation:       Home, Heart, BookMarked, Search, Info, HelpCircle, User
// Near You:         MapPin            → IC_TEAL_*
// Explore:          Globe             → IC_PLUM_*
// Trending:         Flame             → IC_TERRACOTTA_*
// Food Halls:       Warehouse         → IC_AMBER_*
// Top Rated:        Star              → IC_AMBER_*
// Chips — Open now: Clock             → IC_TEAL_*
// Chips — Takeout:  ShoppingBag       → IC_TEAL_*
// Chips — Late night: Moon            → IC_TEAL_*
// Chips — Date night: Sparkles        → IC_PLUM_*
// Chips — Food halls: Warehouse       → IC_AMBER_*
// Badges — #1 Dish:   ChefHat         → IC_TEAL_D  (vivid green on dark)
// Badges — Top Insight: Lightbulb     → IC_AMBER_D
// Badges — Best Advice: Info          → IC_TERRACOTTA_D
// Score tiers: existing vivid colors — NOT touched by icon system

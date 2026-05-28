'use client';
import { useState, useEffect, useRef, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";

type MustOrder = { item?: string; differentiator?: string; why?: string } | null;
type AlsoTry = string | { dish?: string; note?: string } | null;
type Restaurant = {
  name: string; rank?: number; website_domain?: string; neighborhood?: string;
  price_range?: string; venue_type?: string; dish_mentions?: number; hours?: string;
  specials?: string; experience_note?: string; what_it_is?: string; win_reason?: string;
  top_descriptors?: string[]; must_orders?: MustOrder[]; also_try?: AlsoTry[];
  food_score?: number; verdict?: string; best_quote?: string;
  warnings?: (string | null)[]; address?: string; cuisine?: string;
};
type DeepDiveData = {
  name: string; neighborhood?: string; price_range?: string; venue_type?: string;
  food_score?: number; hours?: string; specials?: string; experience_note?: string;
  must_orders?: MustOrder[]; also_try?: AlsoTry[]; skip?: (string | null)[];
  insider_tips?: (string | null)[]; vibe_tags?: string[]; verdict?: string;
  address?: string; cuisine?: string;
};
type Vendor = {
  name?: string; specialty?: string; food_score?: number; price_range?: string;
  the_order?: string; why?: string; insider_note?: string;
};
type MarketData = {
  market_name: string; location?: string; hours?: string; vibe?: string;
  vendors?: (Vendor | null)[];
};
type Alternative = {
  name?: string; neighborhood?: string; cuisine?: string; venue_type?: string;
  food_score?: number; price_range?: string; verdict_vs_original?: string;
  go_here_if?: string; must_order?: string; must_order_why?: string; address?: string;
};
type CompareData = {
  original?: { name?: string; food_score?: number };
  alternatives?: (Alternative | null)[];
  search_area?: string; _mode?: string; _originalScore?: number;
};
type SearchMeta = { dish: string; city: string };
type ConfirmMatch = { name: string; address?: string; city?: string; neighborhood?: string; cuisine?: string };
type Fav = { name: string; neighborhood?: string; venue_type?: string; price_range?: string; food_score?: number };
type NarrowQuestion = { question: string; options: string[] };
type NavEntry = {
  phase: string; restaurants: Restaurant[]; meta: SearchMeta | null;
  searchedDish: string; deepData: DeepDiveData | null; compareData: CompareData | null;
  marketData: MarketData | null; expanded: number | null; tab: string;
};
type UserType = User | null;
type UserList = { id: string; name: string };
type AddToListTarget = { name: string; neighborhood?: string; venue_type?: string; price_range?: string; food_score?: number; cuisine?: string };

// ─── NEON THEME TOKENS ────────────────────────────────────────────────────────
const T = {
  bg:      "#0C0C0C",
  card:    "#141414",
  card2:   "#1C1C1C",
  border:  "#2A2A2A",
  border2: "#383838",
  text:    "#F0EDE8",
  muted:   "#888",
  dim:     "#444",
  neon:    "#FFB800",
  neonGlow:"#FFB80033",
  green:   "#2ECC71",
  red:     "#FF4444",
  blue:    "#4A9EFF",
  purple:  "#B56BFF",
};
const BROWSE: Record<string, Record<string, Record<string, string[]>>> = {
  "🕐 By Meal Time": {
    "🌅 Breakfast & Brunch": {
      "American":      ["Pancakes","Waffles","French Toast","Eggs Benedict","Omelets","Biscuits & Gravy","Chicken & Waffles","Shakshuka","Smoked Salmon Bagel","Avocado Toast","Monte Cristo","Steak & Eggs","Açaí Bowl"],
      "Southern":      ["Shrimp & Grits","Chicken Biscuit","Country Ham & Eggs","Red Velvet Pancakes","Catfish & Eggs","Grillades & Grits"],
      "Mexican":       ["Chilaquiles","Huevos Rancheros","Breakfast Tacos","Menudo","Birria + Consommé","Machaca","Tamales"],
      "Asian":         ["Congee / Jook","Dim Sum","Taiwanese Breakfast","Japanese Breakfast Set","Nasi Lemak","Roti Canai","Jianbing"],
      "Bakery":        ["Croissant","Pain au Chocolat","Kouign-Amann","Cinnamon Roll","Canelé","Bagels & Lox","Danish","Scones"],
    },
    "☀️ Lunch": {
      "Sandwiches":    ["Smash Burger","Lobster Roll","Fried Chicken Sandwich","Cheesesteak","French Dip","Cubano","Bánh Mì","Italian Beef","Muffuletta","Reuben","Patty Melt","Club","BLT"],
      "Bowls & Salads":["Poke Bowl","Grain Bowl","Cobb Salad","Caesar Salad","Niçoise","Fattoush","Chirashi Bowl"],
      "Soups":         ["Clam Chowder","French Onion Soup","Tom Yum","Tortilla Soup","Pho","Ramen","Wonton Soup"],
      "Pizza":         ["Neapolitan","NY Slice","Detroit","New Haven/Apizza","Sicilian","Roman al Taglio","Bar Pizza"],
      "Tacos":         ["Fish","Carne Asada","Al Pastor","Adobada","Birria","Carnitas","Lengua","Shrimp","Lobster","Barbacoa"],
    },
    "🌙 Dinner": {
      "Steakhouse":    ["Ribeye","NY Strip","Filet Mignon","Tomahawk","Wagyu","Porterhouse","Dry-Aged","Prime Rib","Surf & Turf"],
      "Seafood":       ["Oysters","Whole Lobster","King Crab","Dungeness Crab","Branzino","Halibut","Grilled Whole Fish","Bouillabaisse","Clam Chowder"],
      "BBQ":           ["Brisket","Beef Ribs","Baby Back Ribs","Burnt Ends","Pulled Pork","Smoked Turkey","BBQ Platter","Smoked Sausage"],
      "Italian":       ["Fresh Pasta","Osso Buco","Bistecca Fiorentina","Wood-Fired Pizza","Risotto","Seafood Pasta","Vitello Tonnato"],
      "Japanese":      ["Omakase Sushi","Kaiseki","Shabu Shabu","Wagyu Sukiyaki","Yakitori Omakase"],
    },
    "🍹 Bar Bites & Happy Hour": {
      "Raw Bar":       ["Oysters on the Half Shell","Shrimp Cocktail","Crab Claws","Crudo","Uni","Caviar"],
      "Snacks":        ["Chicken Wings","Nachos","Sliders","Deviled Eggs","Cheese & Charcuterie","Fried Calamari"],
      "Izakaya Style": ["Yakitori","Gyoza","Karaage","Takoyaki","Edamame","Agedashi Tofu"],
      "Wine Bar":      ["Burrata","Crostini","Marinated Olives","Mushroom Toast","Tuna Crudo"],
      "Late Night":    ["Smash Burger","Street Tacos","Birria","Carne Asada Fries","Pizza by the Slice","Pho","Ramen"],
    },
    "🍦 Desserts": {
      "Ice Cream":     ["Gelato","Soft Serve","Sundae","Shaved Ice","Mochi Ice Cream","Rolled Ice Cream","Paletas","Sorbet"],
      "Pastries":      ["Croissant","Kouign-Amann","Canelé","Éclair","Mille-Feuille","Churros","Donuts","Cinnamon Roll"],
      "Cakes":         ["Tiramisu","Tres Leches","Cheesecake","Chocolate Lava Cake","Crème Brûlée","Panna Cotta","Opera Cake"],
      "Asian Sweets":  ["Boba / Bubble Tea","Mango Sticky Rice","Egg Tarts","Matcha Desserts","Halo-Halo","Mango Pomelo Sago","Bing Tanghulu"],
      "Middle Eastern":["Baklava","Kunafa","Halva","Maamoul","Basbousa"],
    },
  },

  "🌍 International Cuisines": {
    "🗽 American (Regional)": {
      "New England":       ["Clam Chowder","Lobster Roll","Lobster Bisque","Fish & Chips","Fried Clams","New England Boil","Anadama Bread","Boston Baked Beans"],
      "Mid-Atlantic":      ["Philly Cheesesteak","NY Pizza","NY Bagel & Lox","Maryland Crab Cakes","Buffalo Wings","NYC Hot Dog","New Jersey Pork Roll","Disco Fries"],
      "Southern":          ["Fried Chicken","Fried Catfish","Shrimp & Grits","Chicken & Waffles","Biscuits & Gravy","Hush Puppies","Pulled Pork","Fried Green Tomatoes","Sweet Potato Pie"],
      "Cajun & Creole":    ["Gumbo","Jambalaya","Crawfish Étouffée","Po'Boy","Beignets","Muffuletta","Red Beans & Rice","Boudin","Blackened Catfish","Bananas Foster"],
      "Texas BBQ & More":  ["Brisket","Beef Ribs","Chicken Fried Steak","Texas Chili (no beans)","Kolaches","Breakfast Tacos","Puffy Tacos","Frito Pie"],
      "Southwest":         ["Green Chile Cheeseburger","Posole","Navajo Fry Bread","Sopapillas","Chile Verde","Hatch Chile"],
      "California":        ["Fish Tacos","Cali Burrito","Avocado Toast","Farm-to-Table","In-N-Out Style Burger","California Roll","Sourdough","Grain Bowl"],
      "Pacific Northwest":  ["Dungeness Crab","Wild Salmon","Geoduck","Pacific Oysters","Teriyaki","Uni","Albacore Tuna","Ramps & Morels"],
      "Hawaii":            ["Poke","Plate Lunch","Loco Moco","Kalua Pork","Spam Musubi","Shave Ice","Malasadas","Haupia","Chicken Long Rice"],
      "Midwest":           ["Chicago Deep Dish","Chicago Hot Dog","Butter Burger","Cheese Curds","Walleye","Bratwurst","Runza","Toasted Ravioli","Goetta"],
    },
    "🌮 Mexican & Tex-Mex": {
      "Tacos":             ["Carne Asada","Al Pastor","Adobada","Fish","Birria","Carnitas","Lengua","Cabeza","Shrimp","Lobster","Barbacoa","Campechano","Suadero"],
      "Antojitos":         ["Sopes","Tlayudas","Huaraches","Gorditas","Tamales","Elotes","Esquites","Tostadas","Quesadillas"],
      "Moles & Stews":     ["Mole Negro","Mole Rojo","Birria","Pozole","Menudo","Cochinita Pibil","Caldo de Res","Caldo Tlalpeño"],
      "Seafood":           ["Ceviche","Aguachile","Campechana","Fish Tacos","Shrimp Tacos","Camarones a la Diabla","Pescado Zarandeado"],
      "Regional":          ["Chiles en Nogada (Puebla)","Enchiladas Suizas","Chiles Rellenos","Tlayudas (Oaxacan)","Cemitas (Puebla)","Tortas Ahogadas (Guadalajara)"],
      "Tex-Mex":           ["Queso","Fajitas","Breakfast Tacos","Chili con Carne","Cheese Enchiladas","Puffy Tacos"],
    },
    "🌎 Latin American": {
      "Peruvian":          ["Ceviche","Lomo Saltado","Causa","Aji de Gallina","Anticuchos","Pollo a la Brasa","Tiradito","Arroz con Leche","Pisco Sour"],
      "Colombian":         ["Bandeja Paisa","Ajiaco","Empanadas","Sancocho","Arepa","Changua","Buñuelos"],
      "Brazilian":         ["Churrasco","Feijoada","Coxinha","Pão de Queijo","Moqueca","Açaí","Brigadeiro","Picanha"],
      "Argentine":         ["Asado","Empanadas","Milanesa","Choripán","Chimichurri Steak","Dulce de Leche","Alfajores"],
      "Cuban":             ["Ropa Vieja","Lechón","Cuban Sandwich","Moros y Cristianos","Vaca Frita","Platanos Maduros","Flan"],
      "Venezuelan":        ["Arepas","Pabellón Criollo","Cachapas","Tequeños","Hallacas","Mandocas"],
      "Salvadoran":        ["Pupusas","Curtido","Sopa de Pata","Yuca Frita","Tamales de Elote"],
    },
    "🏝 Caribbean": {
      "Jamaican":          ["Jerk Chicken","Jerk Pork","Oxtail Stew","Curry Goat","Ackee & Saltfish","Brown Stew Chicken","Escovitch Fish","Steamed Fish","Rice & Peas","Festival","Jamaican Beef Patty","Callaloo"],
      "Haitian":           ["Griot","Diri ak Djon Djon","Poul nan Sos","Accra","Boulette","Legume","Tassot","Soup Joumou"],
      "Trinidadian":       ["Doubles","Roti","Curry Crab & Dumplings","Pelau","Bake & Shark","Callaloo","Macaroni Pie"],
      "Puerto Rican":      ["Lechón","Pernil","Mofongo","Arroz con Gandules","Alcapurrias","Tostones","Pasteles","Tembleque"],
      "Dominican":         ["La Bandera","Sancocho","Mangu","Chivo Guisado","Tostones","Moro de Guandules"],
    },
    "🥢 Chinese": {
      "Cantonese":         ["Dim Sum","Char Siu Pork","Roast Duck","Wonton Noodles","Steamed Fish","Congee","Chicken Rice","Egg Tarts","Har Gow","Siu Mai"],
      "Sichuan":           ["Mapo Tofu","Dan Dan Noodles","Kung Pao Chicken","Sichuan Hot Pot","Twice-Cooked Pork","Dumplings in Chili Oil","Husband & Wife Beef","Fish-Fragrant Pork"],
      "Shanghainese":      ["XLB / Soup Dumplings","Red-Braised Pork","Pan-Fried Buns","Scallion Oil Noodles","Hairy Crab","Drunken Chicken","Eight Treasure Rice"],
      "Northern Chinese":  ["Peking Duck","Lanzhou Beef Noodles","Zha Jiang Mian","Hand-Ripped Noodles","Lamb Skewers","Jianbing","Jiaozi Dumplings"],
      "Taiwanese":         ["Beef Noodle Soup","Oyster Vermicelli","Lu Rou Fan","Scallion Pancake","Gua Bao","Bubble Tea","Stinky Tofu","Oyster Omelette"],
      "Hunan":             ["Red-Braised Pork","Smoked Pork","Spicy Fish Head","Dry-Pot Dishes","Steamed Eggs with Minced Pork"],
      "Fujian / Hokkien":  ["Buddha Jumps Over the Wall","Oyster Noodles","Peanut Soup","Braised Pork Rice"],
      "AYCE & Hot Pot":    ["Sichuan Hot Pot","Cantonese Hot Pot","AYCE Sushi","AYCE BBQ","Dim Sum Brunch"],
    },
    "🍱 Japanese": {
      "Sushi":             ["Omakase","Nigiri","Sashimi","Temaki / Hand Rolls","Chirashi","Pressed Sushi","AYCE Sushi","Dragon Roll"],
      "Ramen":             ["Tonkotsu","Shoyu","Miso","Shio","Tsukemen (Dipping)","Mazemen (Dry)","Spicy Tantanmen","Vegan Ramen"],
      "Noodles & Rice":    ["Udon","Soba","Yakisoba","Katsu Curry","Oyakodon","Tekkadon","Hiyashi Chuka"],
      "Grilled & Fried":   ["Yakitori","Tonkatsu","Karaage","Tempura","Gyoza","Takoyaki","Okonomiyaki","Katsu Sando"],
      "Hot Pot":           ["Shabu Shabu","Sukiyaki","Motsunabe","Oden","Chankonabe"],
      "Fine Dining":       ["Kaiseki","Kappo","Wagyu Tasting","Omakase Sushi","Fugu"],
    },
    "🥘 Korean": {
      "BBQ":               ["Galbi (Short Rib)","Bulgogi","Samgyeopsal (Pork Belly)","Chadolbaegi (Brisket)","Neck & Tongue","LA Galbi","AYCE Korean BBQ"],
      "Stews & Soups":     ["Sundubu Jjigae","Kimchi Jjigae","Doenjang Jjigae","Seolleongtang","Samgyetang","Budae Jjigae","Gejang","Tteokguk"],
      "Rice & One-Bowl":   ["Bibimbap","Dolsot Bibimbap","Gimbap","Jokbal","Bokkeum Rice","Dakgalbi"],
      "Noodles":           ["Jjajangmyeon","Naengmyeon","Japchae","Kalguksu","Mul Naengmyeon"],
      "Fried & Street":    ["Korean Fried Chicken","Tteokbokki","Pajeon (Scallion Pancake)","Hotteok","Bao Buns","Twigim"],
      "Raw & Specialty":   ["Yukhoe (Beef Tartare)","Hoe (Korean Sashimi)","Gopchang (Offal BBQ)","Sannakji (Live Octopus)"],
    },
    "🌶 Thai": {
      "Curries":           ["Green Curry","Red Curry","Massaman","Panang","Yellow Curry","Jungle Curry (Kaeng Pa)"],
      "Noodles":           ["Pad Thai","Pad See Ew","Drunken Noodles","Khao Soi","Boat Noodles","Rad Na","Ba Mee"],
      "Rice Dishes":       ["Khao Man Gai","Pad Kra Pao","Khao Pad","Khao Na Pet"],
      "Salads & Cold":     ["Som Tum","Larb","Yum Nua","Yum Talay","Nam Tok"],
      "Soups":             ["Tom Yum","Tom Kha","Khao Tom","Tom Klong"],
      "Grilled & Street":  ["Satay","Thai Fish Cakes","Moo Ping","Rotee","Sai Ua","Grilled Squid"],
    },
    "🍜 Vietnamese": {
      "Pho & Soups":       ["Pho Bo (Beef)","Pho Ga (Chicken)","Bun Bo Hue","Mi Quang","Banh Canh","Chao (Congee)","Hu Tieu"],
      "Sandwiches":        ["Banh Mi Thit Nguoi","Banh Mi Ga","Banh Mi Op La","Banh Mi Xiu Mai"],
      "Rice Dishes":       ["Com Tam (Broken Rice)","Com Ga","Xoi (Sticky Rice)","Com Chien (Fried Rice)"],
      "Noodle Salads":     ["Bun Cha","Bun Thit Nuong","Bun Bo Nam Bo","Bun Rieu"],
      "Grilled & Fried":   ["Bo Luc Lac","Banh Xeo","Bo Nuong Vi","Ca Kho To","Cha Ca La Vong"],
      "Fresh & Cold":      ["Fresh Spring Rolls (Goi Cuon)","Goi (Salad)","Nem Cuon"],
    },
    "🍚 Filipino": {
      "Classics":          ["Adobo","Sinigang","Kare-Kare","Sisig","Lechon Kawali","Crispy Pata","Caldereta","Mechado","Pinakbet"],
      "Grilled":           ["Inihaw na Baboy","Lechon Manok","Isaw","BBQ Skewers","Liempo"],
      "Rice & Noodles":    ["Pancit Canton","Pancit Bihon","Sinangag","Arroz Caldo","Champorado"],
      "Street Food":       ["Balut","Kwek Kwek","Fish Balls","Isaw","Halo-Halo","Turon"],
    },
    "🥥 Indonesian & Malaysian": {
      "Indonesian":        ["Nasi Goreng","Mie Goreng","Rendang","Satay","Gado-Gado","Soto Ayam","Bakso","Nasi Padang","Tempeh","Rawon"],
      "Malaysian":         ["Nasi Lemak","Char Kway Teow","Hokkien Mee","Roti Canai","Laksa","Satay","Cendol","Asam Laksa","Bak Kut Teh"],
      "Singaporean":       ["Chili Crab","Hainanese Chicken Rice","Laksa","Char Kway Teow","Hokkien Mee","Kaya Toast","Bak Chor Mee"],
    },
    "🍛 Indian": {
      "North Indian":      ["Butter Chicken","Tikka Masala","Biryani","Rogan Josh","Naan","Dal Makhani","Saag Paneer","Aloo Gobi","Chole Bhature"],
      "South Indian":      ["Masala Dosa","Idli & Sambar","Chettinad Chicken","Malabar Fish Curry","Appam","Kerala Prawn Moilee","Rasam"],
      "Street Food":       ["Pani Puri","Bhel Puri","Sev Puri","Chaat","Samosas","Vada Pav","Kathi Roll","Dahi Puri"],
      "Mughlai":           ["Biryani","Korma","Nihari","Haleem","Seekh Kebab","Shammi Kebab"],
      "Regional Gems":     ["Hyderabadi Biryani","Goan Fish Curry","Bengali Mustard Fish","Rajasthani Laal Maas","Gujarati Thali","Kashmiri Rogan Josh"],
    },
    "🫙 Middle Eastern": {
      "Lebanese":          ["Hummus","Falafel","Shawarma","Kibbeh","Manakeesh","Fattoush","Tabbouleh","Mezze Spread","Kafta","Labneh","Sfeeha"],
      "Persian/Iranian":   ["Ghormeh Sabzi","Fesenjan","Joojeh Kabab","Koobideh","Zereshk Polo","Mirza Ghasemi","Ash Reshteh","Baghali Polo","Sholeh Zard"],
      "Turkish":           ["Lahmacun","Iskender Kebab","Adana Kebab","Manti","Mercimek Çorbası","Börek","Baklava","Pide","Kofte"],
      "Israeli":           ["Shakshuka","Falafel","Sabich","Jerusalem Mixed Grill","Malawach","Jachnun","Kubeh","Hummus with Mushrooms"],
      "Moroccan":          ["Tagine","B'stilla","Couscous","Harira","Msemen","Kefta","Chermoula Fish","Zaalouk"],
    },
    "🌍 African": {
      "Ethiopian":         ["Doro Wat","Tibs","Kitfo","Gored Gored","Injera Spread","Misir Wat","Shiro","Gomen","Atakilt","Zilzil","Yebeg Tibs","Beyaynetu (Veg Combo)"],
      "West African":      ["Jollof Rice","Egusi Soup","Suya","Pounded Yam & Soup","Akara","Pepper Soup","Kelewele","Fufu","Chin Chin","Waakye"],
      "East African":      ["Nyama Choma","Ugali","Pilau","Mandazi","Mishkaki","Maharagwe","Chapati & Beans"],
      "Somali":            ["Bariis iskukaris","Suqaar","Hilib Ari","Sambuusa","Muqmad","Anjero"],
      "South African":     ["Braai (BBQ)","Bobotie","Bunny Chow","Boerewors","Pap & Wors","Malva Pudding","Koeksisters"],
    },
    "🥐 European": {
      "Italian":           ["Neapolitan Pizza","Fresh Pasta","Osso Buco","Bistecca Fiorentina","Seafood Pasta","Risotto","Burrata","Arancini","Tiramisu","Gelato","Cannoli"],
      "French":            ["Steak Frites","Duck Confit","Bouillabaisse","French Onion Soup","Coq au Vin","Sole Meunière","Escargot","Beef Bourguignon","Crème Brûlée","Croissant","Tarte Tatin"],
      "Spanish":           ["Paella","Tapas","Gambas al Ajillo","Croquetas","Jamón Ibérico","Tortilla Española","Pulpo a la Gallega","Pintxos","Churros","Crema Catalana"],
      "Greek":             ["Moussaka","Spanakopita","Grilled Octopus","Lamb Souvlaki","Saganaki","Horiatiki","Lamb Kleftiko","Loukoumades","Baklava"],
      "Portuguese":        ["Bacalhau","Pastéis de Nata","Bifanas","Caldo Verde","Francesinha","Piri Piri Chicken","Sardinhas","Arroz de Marisco"],
      "Eastern European":  ["Pierogi","Borscht","Pelmeni","Beef Stroganoff","Kielbasa","Stuffed Cabbage","Varenyky","Beef Goulash","Schnitzel","Knish"],
      "German":            ["Bratwurst","Pretzels","Sauerbraten","Schnitzel","Rouladen","Käsespätzle","Black Forest Cake","Currywurst"],
    },
    "🗺 Other / Specialty": {
      "Hawaiian":          ["Poke","Plate Lunch","Loco Moco","Kalua Pork","Spam Musubi","Shave Ice","Malasadas","Haupia","Chicken Long Rice","Saimin"],
      "Georgian (Caucasus)":["Khachapuri","Khinkali","Churchkhela","Lobiani","Pkhali","Satsivi","Badrijani Nigvzit"],
      "Uzbek / Central Asian":["Plov","Samsa","Shashlik","Lagman","Manti","Dimlama","Non Bread"],
      "Armenian":          ["Dolma","Khorovats (BBQ)","Lahmajoun","Manti","Harissa","Ghapama","Pakhlava"],
      "Jewish Deli":       ["Pastrami on Rye","Matzo Ball Soup","Latkes","Brisket","Knish","Lox & Bagel","Rugelach","Black & White Cookie"],
      "Modern Fusion":     ["Korean-Mexican","Japanese-Peruvian (Nikkei)","Indo-Chinese","Chifa","Cal-Mex","Asian-Soul Food"],
    },
  },
};

// ─── PROMPTS ──────────────────────────────────────────────────────────────────


// ─── API HELPER ───────────────────────────────────────────────────────────────
async function apiFetch(path: string, body: object) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

let _sb: ReturnType<typeof createBrowserClient> | null = null;
const sb = () => {
  if (!_sb) _sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _sb;
};
const VENUE_META: Record<string,{icon:string;clr:string}>={
  "hole-in-the-wall":{icon:"🏚",clr:"#AAA"},
  "counter service":{icon:"🥡",clr:"#B56BFF"},
  "food truck":{icon:"🚚",clr:"#FFB800"},
  "casual dine-in":{icon:"🍽",clr:"#2ECC71"},
  "upscale casual":{icon:"✨",clr:"#4A9EFF"},
  "fine dining":{icon:"💎",clr:"#D4A8FF"},
};
const ACCENTS=["#FFB800","#B56BFF","#4A9EFF","#FF6B35","#2ECC71","#FF4444"];
const DISH_MAP: Record<string,string>={burger:"🍔",pizza:"🍕",ramen:"🍜",taco:"🌮",sushi:"🍣",carnitas:"🌮",birria:"🌮",pasta:"🍝",steak:"🥩",chicken:"🍗",seafood:"🦞",dumpling:"🥟",curry:"🍛",pho:"🍜",pancake:"🥞",egg:"🍳",shrimp:"🍤",bbq:"🍖",lobster:"🦞",oyster:"🦪",donut:"🍩",cake:"🎂",crab:"🦀",fish:"🐟",rice:"🍚",noodle:"🍜",bread:"🍞",jerk:"🌶",oxtail:"🫙",poke:"🍣",chowder:"🍲",gumbo:"🫕",mole:"🌶"};
const dEmoji=(d:string|null|undefined):string=>{if(!d)return"🍽️";const l=d.toLowerCase();return Object.entries(DISH_MAP).find(([k])=>l.includes(k))?.[1]??"🍽️";};
const gURL=(n:string,h?:string,c?:string):string=>`https://www.google.com/search?q=${encodeURIComponent([n,h,c].filter(Boolean).join(" "))}`;
const dirURL=(addr:string|undefined,n:string,c:string):string=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr||`${n} ${c}`)}`;

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function ScoreRing({score,size=52}:{score:number;size?:number}){
  const safeScore=typeof score==="number"&&!isNaN(score)?score:5;const r=size/2-4,circ=2*Math.PI*r,off=circ-(safeScore/10)*circ;
  const clr=safeScore>=8?"#2ECC71":safeScore>=7?"#FFB800":safeScore>=6?"#FF6B35":"#FF4444";
  const lbl=safeScore>=8?"Excellent":safeScore>=7?"Very Good":safeScore>=6?"Good":safeScore>=5?"Average":"Below Avg";
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#2A2A2A" strokeWidth="3"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
        </svg>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontFamily:"'IBM Plex Mono',monospace",fontSize:size>58?"0.9rem":"0.72rem",fontWeight:700,color:clr,lineHeight:1,textAlign:"center"}}>{safeScore.toFixed(1)}</div>
      </div>
      <div style={{fontSize:"0.38rem",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:1,color:clr,textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap"}}>{lbl}</div>
    </div>
  );
}

const PriceTag=({price}:{price?:string})=>{
  if(!price)return null;
  const a=["$","$$","$$$","$$$$"].indexOf(price);
  return <span>{[0,1,2,3].map(i=><span key={i} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.68rem",fontWeight:700,color:i<=a?T.neon:T.dim}}>$</span>)}</span>;
};

const VenueBadge=({type}:{type:string})=>{
  const m=VENUE_META[type]||{icon:"🍽",clr:T.muted};
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,color:m.clr,border:`1px solid ${m.clr}44`,fontSize:"0.58rem",fontWeight:700,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap",background:`${m.clr}11`}}>{m.icon} {type}</span>;
};

function Photo({domain,name,rank,dish}:{domain?:string;name?:string;rank:number;dish?:string}){
  const [f,setF]=useState(false);
  const clr=ACCENTS[rank%ACCENTS.length];
  const init=(name||"?").split(" ").slice(0,2).map(w=>w[0]||"").join("").toUpperCase();
  if(domain&&!f)return(
    <div style={{width:"100%",height:"100%",background:T.card2,display:"flex",alignItems:"center",justifyContent:"center",padding:6}}>
      <img src={`https://logo.clearbit.com/${domain}`} alt={name} onError={()=>setF(true)} style={{maxWidth:"80%",maxHeight:"80%",objectFit:"contain",filter:"brightness(1.1)"}}/>
    </div>
  );
  return(
    <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${clr}15,${clr}25)`,border:`1px solid ${clr}33`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
      <div style={{fontSize:"1.4rem",lineHeight:1}}>{dEmoji(dish)}</div>
      <div style={{fontSize:"0.5rem",fontWeight:800,color:clr,letterSpacing:1}}>{init}</div>
    </div>
  );
}

function PlacesPhotoThumb({name,city,fallback}:{name?:string;city?:string;fallback:ReactNode}){
  const [src,setSrc]=useState<string|null>(null);
  useEffect(()=>{
    if(!name)return;
    fetch(`/api/photos?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city||"")}`)
      .then(r=>r.json()).then(d=>{if(d.photos?.[0])setSrc(`/api/photo?name=${encodeURIComponent(d.photos[0])}`);}).catch(()=>{});
  },[name,city]);
  if(!src)return fallback;
  return <img src={src} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={()=>setSrc(null)}/>;
}

function PlacesPhotoStrip({name,city}:{name?:string;city?:string}){
  const [photos,setPhotos]=useState<string[]>([]);
  useEffect(()=>{
    if(!name)return;
    fetch(`/api/photos?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city||"")}`)
      .then(r=>r.json()).then(d=>{if(d.photos?.length)setPhotos(d.photos.slice(0,6));}).catch(()=>{});
  },[name,city]);
  if(!photos.length)return null;
  return(
    <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 16px 14px",scrollbarWidth:"none"}}>
      {photos.map((p,i)=>(
        <img key={i} src={`/api/photo?name=${encodeURIComponent(p)}`} alt=""
          style={{height:140,width:"auto",minWidth:100,maxWidth:220,borderRadius:8,objectFit:"cover",flexShrink:0,border:`1px solid ${T.border}`}}/>
      ))}
    </div>
  );
}

// ─── BROWSE ───────────────────────────────────────────────────────────────────
function Browse({onSelect,disabled}:{onSelect:(dish:string)=>void;disabled:boolean}){
  const [section,setSection]=useState<string|null>(null);
  const [cat,setCat]=useState<string|null>(null);
  const [sub,setSub]=useState<string|null>(null);

  const sections=Object.keys(BROWSE);
  const cats=section?Object.keys(BROWSE[section]):[];
  const subs=section&&cat?Object.keys(BROWSE[section][cat]):[];
  const dishes=section&&cat&&sub?BROWSE[section][cat][sub]:[];

  const btn=(label:string,active:boolean,onClick:()=>void,isDish=false)=>(
    <button disabled={disabled} onClick={onClick} style={{border:`1.5px solid ${active?T.neon:T.border2}`,background:active?`${T.neon}18`:T.card2,color:active?T.neon:T.muted,fontFamily:"'Inter',sans-serif",fontSize:"0.76rem",fontWeight:active?700:500,padding:"6px 12px",cursor:"pointer",borderRadius:20,transition:"all .15s",whiteSpace:"nowrap",boxShadow:active?`0 0 8px ${T.neon}44`:"none"}}
      onMouseEnter={e=>{if(!active&&!isDish){e.currentTarget.style.borderColor=T.neon;e.currentTarget.style.color=T.neon;}if(isDish){e.currentTarget.style.borderColor=T.neon;e.currentTarget.style.background=T.neon;e.currentTarget.style.color="#000";}}}
      onMouseLeave={e=>{if(!active&&!isDish){e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.muted;}if(isDish&&!active){e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.background=T.card2;e.currentTarget.style.color=T.muted;}}}
    >{label}</button>
  );

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div>
        <div className="slbl">Browse by</div>
        <div className="prow">
          {sections.map(s=>btn(s,section===s,()=>{setSection(s);setCat(null);setSub(null);}))}
        </div>
      </div>
      {section&&<div style={{animation:"up .15s ease"}}>
        <div className="slbl">{section==="🕐 By Meal Time"?"Meal / Time":"Cuisine"}</div>
        <div className="prow">{cats.map(c=>btn(c,cat===c,()=>{setCat(c);setSub(null);}))}</div>
      </div>}
      {cat&&<div style={{animation:"up .15s ease"}}>
        <div className="slbl">Category</div>
        <div className="prow">{subs.map(s=>btn(s,sub===s,()=>setSub(s)))}</div>
      </div>}
      {sub&&<div style={{animation:"up .15s ease"}}>
        <div className="slbl">Pick a dish →</div>
        <div className="prow">{dishes.map(d=>btn(d,false,()=>onSelect(d),true))}</div>
      </div>}
    </div>
  );
}

// ─── SEARCH RESULT CARD ───────────────────────────────────────────────────────
function RestCard({r,i,expanded,onToggle,onDeepDive,meta,searchedDish,isFav,onToggleFav,onAddToList}:{
  r:Restaurant;i:number;expanded:number|null;onToggle:(i:number)=>void;
  onDeepDive:(name:string)=>void;meta:SearchMeta|null;searchedDish:string;
  isFav:boolean;onToggleFav:(r:Restaurant)=>void;
  onAddToList?:(r:Restaurant)=>void;
}){
  const isOpen=expanded===i;
  const mos=Array.isArray(r.must_orders)?r.must_orders:[];
  const also=Array.isArray(r.also_try)?r.also_try:[];
  const sep=<span style={{color:T.border2,fontSize:"0.45rem"}}>·</span>;
  const [cardPhotoSrc,setCardPhotoSrc]=useState<string|null>(null);
  const [lightboxSrc,setLightboxSrc]=useState<string|null>(null);
  useEffect(()=>{
    if(!r.name)return;
    fetch(`/api/photos?name=${encodeURIComponent(r.name)}&city=${encodeURIComponent(meta?.city||"")}`)
      .then(res=>res.json()).then(d=>{if(d.photos?.[0])setCardPhotoSrc(`/api/photo?name=${encodeURIComponent(d.photos[0])}`);}).catch(()=>{});
  },[r.name,meta?.city]);

  return(
    <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,width:"100%"}}>
      <div style={{padding:"13px 16px 0"}}>
        <div style={{display:"flex",gap:11,alignItems:"flex-start",marginBottom:9}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:70,height:70,borderRadius:7,overflow:"hidden",border:`1px solid ${T.border}`}}>
              <PlacesPhotoThumb name={r.name} city={meta?.city} fallback={<Photo domain={r.website_domain} name={r.name} rank={i} dish={searchedDish}/>}/>
            </div>
            <div style={{position:"absolute",top:-5,left:-5,width:20,height:20,borderRadius:"50%",background:i===0?T.neon:T.card2,color:i===0?"#000":T.text,fontFamily:"'Bebas Neue',sans-serif",fontSize:"0.72rem",display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${T.bg}`,zIndex:1,boxShadow:i===0?`0 0 8px ${T.neon}`:"none"}}>{r.rank}</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:5}}>
              <div style={{fontSize:"0.98rem",fontWeight:800,color:T.text,lineHeight:1.2,wordBreak:"break-word"}}>{r.name}</div>
              <button onClick={e=>{e.stopPropagation();onToggleFav(r);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.95rem",flexShrink:0,padding:"0 2px",lineHeight:1}}>{isFav?"❤️":"🤍"}</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",margin:"3px 0 5px"}}>
              {r.neighborhood&&<span style={{fontSize:"0.67rem",color:T.muted}}>{r.neighborhood}</span>}
              {r.neighborhood&&sep}<PriceTag price={r.price_range}/>{sep}
              <span style={{fontSize:"0.62rem",color:T.muted}}>{r.dish_mentions} mentions</span>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center",marginBottom:4}}>
              {r.venue_type&&<VenueBadge type={r.venue_type}/>}
              <a href={gURL(r.name,r.neighborhood,meta?.city)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:"0.6rem",fontWeight:600,color:T.blue,textDecoration:"none",border:`1px solid ${T.blue}44`,background:`${T.blue}11`,padding:"2px 7px",borderRadius:20}}>📸 Photos</a>
              <a href={dirURL(r.address,r.name,meta?.city??"")} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:"0.6rem",fontWeight:600,color:T.green,textDecoration:"none",border:`1px solid ${T.green}44`,background:`${T.green}11`,padding:"2px 7px",borderRadius:20}}>🗺 Directions</a>
            </div>
          </div>
          <ScoreRing score={r?.food_score??5}/>
        </div>

        {(r.hours||r.specials)&&<div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:5,padding:"7px 9px",marginBottom:8,display:"flex",flexDirection:"column",gap:3}}>
          {r.hours&&<div style={{fontSize:"0.67rem",color:T.text}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.muted,textTransform:"uppercase",marginRight:5}}>Hours</span>{r.hours}</div>}
          {r.specials&&<div style={{fontSize:"0.67rem",color:T.purple}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.muted,textTransform:"uppercase",marginRight:5}}>Special</span>{r.specials}</div>}
        </div>}

        {r.experience_note&&<div style={{fontSize:"0.68rem",lineHeight:1.5,padding:"5px 9px",background:`${T.neon}0D`,borderLeft:`2px solid ${T.neon}`,borderRadius:"0 4px 4px 0",color:`${T.neon}CC`,marginBottom:7}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.34rem",letterSpacing:3,textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:1,opacity:.7}}>⚠ Heads up</span>{r.experience_note}</div>}

        {r.what_it_is&&<div style={{fontSize:"0.68rem",lineHeight:1.5,padding:"5px 9px",background:T.card2,borderLeft:`2px solid ${T.border2}`,borderRadius:"0 4px 4px 0",color:T.muted,marginBottom:7}}>{r.what_it_is}</div>}

        {r.win_reason&&<div style={{fontSize:"0.68rem",color:T.text,lineHeight:1.5,padding:"5px 9px",background:`${T.neon}0A`,borderLeft:`2px solid ${T.neon}66`,borderRadius:"0 4px 4px 0",marginBottom:7}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.34rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",display:"block",marginBottom:1,fontWeight:700}}>Why it ranks here</span>{r.win_reason}</div>}

        {Array.isArray(r.top_descriptors)&&r.top_descriptors.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:7}}>{r.top_descriptors.map((d,j)=><span key={j} style={{background:T.card2,color:T.muted,border:`1px solid ${T.border}`,fontSize:"0.6rem",padding:"2px 7px",borderRadius:4,fontWeight:500}}>{d}</span>)}</div>}

        {mos.length>0&&<div style={{marginBottom:7}}>{mos.filter(mo=>mo!=null).map((mo,j)=>(
          <div key={j} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:"9px 11px",marginBottom:5,display:"flex",gap:10,alignItems:"flex-start"}}>
            {cardPhotoSrc&&<img src={cardPhotoSrc} alt={r.name} onClick={()=>setLightboxSrc(cardPhotoSrc)} style={{width:80,height:80,objectFit:"cover",borderRadius:6,flexShrink:0,cursor:"pointer",border:`1px solid ${T.border2}`}} onError={()=>setCardPhotoSrc(null)}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:7,marginBottom:3}}>
                <div style={{fontSize:"0.92rem",fontWeight:800,color:T.neon,lineHeight:1.2,wordBreak:"break-word"}}>{mo?.item||""}</div>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.34rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",fontWeight:700,whiteSpace:"nowrap",flexShrink:0,marginTop:1,opacity:.7}}>⭐ Must Order</div>
              </div>
              {mo?.differentiator&&<div style={{fontSize:"0.65rem",color:`${T.neon}99`,lineHeight:1.5,marginBottom:2,fontStyle:"italic"}}>{mo.differentiator}</div>}
              {mo?.why&&<div style={{fontSize:"0.63rem",color:T.muted,lineHeight:1.5}}>{mo.why}</div>}
            </div>
          </div>
        ))}</div>}
        {lightboxSrc&&<div onClick={()=>setLightboxSrc(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000D",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <img src={lightboxSrc} alt={r.name} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:10}} onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setLightboxSrc(null)} style={{position:"absolute",top:16,right:16,background:"#1C1C1C",border:"1px solid #383838",color:"#F0EDE8",fontSize:"1.1rem",width:36,height:36,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
        </div>}

        {also.length>0&&<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",padding:"6px 0 10px",borderTop:`1px solid ${T.border}`}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",flexShrink:0}}>Also try</span>
          {also.map((d,j)=>{const label=typeof d==="string"?d:(d&&d.dish)||String(d||"");return <span key={j} style={{background:T.card2,border:`1px solid ${T.border}`,color:T.muted,fontSize:"0.62rem",padding:"2px 7px",borderRadius:12}}>{label}</span>;})}
        </div>}
      </div>

      <div style={{display:"flex",borderTop:`1px solid ${T.border}`}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",cursor:"pointer",gap:4}} onClick={()=>onToggle(i)}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,color:T.dim,textTransform:"uppercase"}}>{isOpen?"Less":"Full verdict"}</span>
          <span style={{fontSize:"0.5rem",color:isOpen?T.neon:T.dim,transition:"transform .2s",display:"block",transform:isOpen?"rotate(180deg)":"none"}}>▼</span>
        </div>
        <div style={{width:1,background:T.border}}/>
        <button onClick={()=>onDeepDive(r.name)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",gap:4,background:"none",border:"none",cursor:"pointer"}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,color:T.blue,textTransform:"uppercase"}}>📍 Deep Dive</span>
        </button>
        {onAddToList&&<><div style={{width:1,background:T.border}}/>
        <button onClick={()=>onAddToList(r)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",gap:4,background:"none",border:"none",cursor:"pointer"}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,color:T.purple,textTransform:"uppercase"}}>📋 List</span>
        </button></>}
      </div>

      {isOpen&&<div style={{padding:"0 16px 13px",borderTop:`1px solid ${T.border}`,animation:"up .18s ease"}}>
        <div style={{borderLeft:`2px solid ${T.neon}`,padding:"7px 10px",margin:"10px 0 8px",background:`${T.neon}08`,borderRadius:"0 5px 5px 0"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.36rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",marginBottom:3}}>Food Verdict</div>
          <div style={{fontSize:"0.74rem",color:T.text,lineHeight:1.7}}>{r.verdict}</div>
        </div>
        {r.best_quote&&<div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:5,padding:"7px 10px",marginBottom:7}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.36rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",marginBottom:3}}>Best food review</div>
          <div style={{fontSize:"0.7rem",color:T.muted,lineHeight:1.75,fontStyle:"italic"}}>"{r.best_quote}"</div>
        </div>}
        {(Array.isArray(r.warnings)?r.warnings:[]).filter(w=>w).map((w,j)=><div key={j} style={{display:"flex",gap:6,fontSize:"0.68rem",color:T.red,background:`${T.red}11`,border:`1px solid ${T.red}44`,borderRadius:5,padding:"5px 9px",marginBottom:4}}>⚠ {w}</div>)}
      </div>}
    </div>
  );
}

// ─── DEEP DIVE RESULT — CHEAT SHEET STYLE ────────────────────────────────────
function DeepDiveResult({data,city,isFav,onFav,onCompare,onMarket,onAddToList}:{
  data:DeepDiveData;city:string;isFav:boolean;onFav:()=>void;
  onCompare:(radius:number,data:DeepDiveData,mode:string)=>void;
  onMarket?:(name:string)=>void;
  onAddToList?:(target:AddToListTarget)=>void;
}){
  const mos=Array.isArray(data.must_orders)?data.must_orders:[];
  const also=Array.isArray(data.also_try)?data.also_try:[];
  const skip=Array.isArray(data.skip)?data.skip:[];
  const tips=Array.isArray(data.insider_tips)?data.insider_tips:[];
  const vibes=Array.isArray(data.vibe_tags)?data.vibe_tags:[];
  const [ddPhotos,setDdPhotos]=useState<string[]>([]);
  const [ddLightbox,setDdLightbox]=useState<string|null>(null);
  useEffect(()=>{
    if(!data.name)return;
    fetch(`/api/photos?name=${encodeURIComponent(data.name)}&city=${encodeURIComponent(city||"")}`)
      .then(r=>r.json()).then(d=>{if(d.photos?.length)setDdPhotos(d.photos.slice(0,3).map((p:string)=>`/api/photo?name=${encodeURIComponent(p)}`));}).catch(()=>{});
  },[data.name,city]);

  return(
    <div style={{background:T.bg}}>
      {/* HERO BANNER */}
      <div style={{background:`linear-gradient(180deg, #1A1400 0%, ${T.bg} 100%)`,borderBottom:`1px solid ${T.neon}33`,padding:"18px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:10}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.6rem",letterSpacing:1,color:T.text,lineHeight:1.05,marginBottom:6}}>{data.name}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
              {data.neighborhood&&<span style={{fontSize:"0.7rem",color:T.muted}}>{data.neighborhood}</span>}
              {data.neighborhood&&<span style={{color:T.border2}}>·</span>}
              <PriceTag price={data.price_range}/>
              {data.venue_type&&<VenueBadge type={data.venue_type}/>}
            </div>
            {vibes.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {vibes.map((v,i)=><span key={i} style={{background:`${T.neon}15`,border:`1px solid ${T.neon}55`,color:T.neon,fontSize:"0.6rem",fontWeight:700,padding:"2px 9px",borderRadius:20,boxShadow:`0 0 6px ${T.neon}33`}}>{v}</span>)}
            </div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <ScoreRing score={data.food_score??5} size={58}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={onFav} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1rem",padding:0}}>{isFav?"❤️":"🤍"}</button>
              {onAddToList&&<button onClick={()=>onAddToList({name:data.name,neighborhood:data.neighborhood,venue_type:data.venue_type,price_range:data.price_range,food_score:data.food_score,cuisine:data.cuisine})} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.95rem",padding:0}} title="Add to list">📋</button>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <a href={gURL(data.name,data.neighborhood,"")} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:"0.62rem",fontWeight:600,color:T.neon,textDecoration:"none",border:`1px solid ${T.neon}44`,background:`${T.neon}11`,padding:"4px 10px",borderRadius:20}}>📸 Photos on Google</a>
          {(data.address||data.name)&&<a href={dirURL(data.address,data.name,"")} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:"0.62rem",fontWeight:600,color:T.green,textDecoration:"none",border:`1px solid ${T.green}44`,background:`${T.green}11`,padding:"4px 10px",borderRadius:20}}>🗺 Directions</a>}
        </div>
      </div>

      <PlacesPhotoStrip name={data.name} city={city}/>

      <div style={{padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {/* HOURS + SPECIALS */}
        {(data.hours||data.specials)&&<div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6,padding:"9px 12px",display:"flex",flexDirection:"column",gap:4}}>
          {data.hours&&<div style={{fontSize:"0.71rem",color:T.text}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginRight:6}}>Hours</span>{data.hours}</div>}
          {data.specials&&<div style={{fontSize:"0.71rem",color:T.purple}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginRight:6}}>Specials</span>{data.specials}</div>}
        </div>}

        {/* EXPERIENCE NOTE */}
        {data.experience_note&&<div style={{fontSize:"0.7rem",lineHeight:1.55,padding:"7px 10px",background:`${T.neon}0D`,borderLeft:`2px solid ${T.neon}`,borderRadius:"0 5px 5px 0",color:`${T.neon}CC`}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.36rem",letterSpacing:3,textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:2,opacity:.7}}>⚠ Heads up before you go</span>{data.experience_note}</div>}

        {/* MUST ORDERS — HERO SECTION */}
        {mos.length>0&&<div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.46rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",marginBottom:8,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
            ⭐ What You're Here For
          </div>
          {mos.filter(mo=>mo!=null).map((mo,j)=>(
            <div key={j} style={{background:T.card,border:`1px solid ${T.neon}33`,borderRadius:8,padding:"12px 14px",marginBottom:7,boxShadow:`0 0 12px ${T.neon}0D`}}>
              {ddPhotos[j]&&<img src={ddPhotos[j]} alt={mo?.item||""} onClick={()=>setDdLightbox(ddPhotos[j])} style={{width:"100%",maxHeight:200,objectFit:"cover",borderRadius:6,marginBottom:10,cursor:"pointer",display:"block"}} onError={()=>setDdPhotos(prev=>{const n=[...prev];n[j]="";return n;})}/>}
              <div style={{fontSize:"1.05rem",fontWeight:800,color:T.neon,lineHeight:1.2,marginBottom:5,wordBreak:"break-word"}}>{mo?.item||""}</div>
              <div style={{fontSize:"0.72rem",color:T.text,lineHeight:1.6}}>{mo?.why||""}</div>
            </div>
          ))}
        </div>}
        {ddLightbox&&<div onClick={()=>setDdLightbox(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000D",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <img src={ddLightbox} alt={data.name} style={{maxWidth:"95vw",maxHeight:"90vh",objectFit:"contain",borderRadius:10}} onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setDdLightbox(null)} style={{position:"absolute",top:16,right:16,background:"#1C1C1C",border:"1px solid #383838",color:"#F0EDE8",fontSize:"1.1rem",width:36,height:36,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>✕</button>
        </div>}

        {/* ALSO WORTH IT */}
        {also.length>0&&<div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.muted,textTransform:"uppercase",marginBottom:7,fontWeight:600}}>Also Worth Ordering</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {also.filter((a):a is NonNullable<AlsoTry>=>a!=null).map((a,j)=><div key={j} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 11px"}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:T.text,marginBottom:2}}>{typeof a==="string"?a:((a&&a.dish)||"")}</div>
              {typeof a==="object"&&a.note&&<div style={{fontSize:"0.68rem",color:T.muted,lineHeight:1.45}}>{a.note}</div>}
            </div>)}
          </div>
        </div>}

        {/* INSIDER TIPS */}
        {tips.length>0&&<div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.muted,textTransform:"uppercase",marginBottom:7,fontWeight:600}}>Insider Tips</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {tips.filter(t=>t!=null).map((t,j)=><div key={j} style={{fontSize:"0.7rem",color:T.blue,background:`${T.blue}0D`,border:`1px solid ${T.blue}33`,borderRadius:5,padding:"6px 10px"}}>💡 {t}</div>)}
          </div>
        </div>}

        {/* SKIP */}
        {skip.length>0&&<div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.muted,textTransform:"uppercase",marginBottom:7,fontWeight:600}}>Skip These</div>
          {skip.filter(s=>s!=null).map((s,j)=><div key={j} style={{fontSize:"0.69rem",color:T.red,background:`${T.red}0D`,border:`1px solid ${T.red}33`,borderRadius:5,padding:"5px 9px",marginBottom:4}}>✕ {s}</div>)}
        </div>}

        {/* VERDICT */}
        <div style={{borderLeft:`2px solid ${T.neon}`,padding:"9px 12px",background:`${T.neon}08`,borderRadius:"0 5px 5px 0"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",marginBottom:4,fontWeight:700}}>The Bottom Line</div>
          <div style={{fontSize:"0.76rem",color:T.text,lineHeight:1.7}}>{data?.verdict||""}</div>
        </div>

        {/* COMPARE NEARBY + MARKET GUIDE */}
        {onCompare&&<div style={{background:T.card,border:`1px solid ${T.blue}33`,borderRadius:8,padding:"12px 13px"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.blue,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>🔍 Explore What's Nearby</div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {/* Compare - similar cuisine */}
            <div>
              <div style={{fontSize:"0.68rem",color:T.muted,marginBottom:7,lineHeight:1.4}}>
                <span style={{color:T.text,fontWeight:600}}>Similar spots</span> — same cuisine, compared on food quality
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase"}}>Within</span>
                {[1,2,5,10,25].map(r=>(
                  <button key={r} onClick={()=>onCompare(r,data,"similar")}
                    style={{border:`1.5px solid ${T.blue}44`,background:`${T.blue}11`,color:T.blue,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.56rem",padding:"5px 10px",cursor:"pointer",borderRadius:20,fontWeight:600,transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${T.blue}22`;e.currentTarget.style.boxShadow=`0 0 6px ${T.blue}44`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${T.blue}11`;e.currentTarget.style.boxShadow="none";}}>
                    {r} mi
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{height:1,background:T.border}}/>

            {/* Compare - anything nearby */}
            <div>
              <div style={{fontSize:"0.68rem",color:T.muted,marginBottom:7,lineHeight:1.4}}>
                <span style={{color:T.text,fontWeight:600}}>Best food nearby</span> — any cuisine, ranked by food quality
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase"}}>Within</span>
                {[1,2,5,10,25].map(r=>(
                  <button key={r} onClick={()=>onCompare(r,data,"any")}
                    style={{border:`1.5px solid ${T.green}44`,background:`${T.green}11`,color:T.green,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.56rem",padding:"5px 10px",cursor:"pointer",borderRadius:20,fontWeight:600,transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${T.green}22`;e.currentTarget.style.boxShadow=`0 0 6px ${T.green}44`;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=`${T.green}11`;e.currentTarget.style.boxShadow="none";}}>
                    {r} mi
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{height:1,background:T.border}}/>

            {/* Market Guide */}
            <div>
              <div style={{fontSize:"0.68rem",color:T.muted,marginBottom:7,lineHeight:1.4}}>
                <span style={{color:T.text,fontWeight:600}}>Food court / market guide</span> — if this place is part of a multi-vendor space
              </div>
              <button onClick={()=>onMarket&&onMarket(data?.name)} style={{display:"inline-flex",alignItems:"center",gap:6,border:`1.5px solid ${T.neon}44`,background:`${T.neon}11`,color:T.neon,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.52rem",letterSpacing:2,textTransform:"uppercase",padding:"7px 14px",cursor:"pointer",borderRadius:20,fontWeight:600,transition:"all .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${T.neon}22`;e.currentTarget.style.boxShadow=`0 0 6px ${T.neon}44`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${T.neon}11`;e.currentTarget.style.boxShadow="none";}}>
                🗺 Market / Food Hall Guide
              </button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}

// ─── MARKET GUIDE RESULT ─────────────────────────────────────────────────────
function MarketGuideResult({data}:{data:MarketData}){
  const vendors=Array.isArray(data.vendors)?data.vendors:[];
  const scoreClr=(s:number)=>s>=8?"#2ECC71":s>=7?"#FFB800":s>=6?"#FF6B35":"#FF4444";

  return(
    <div style={{background:T.bg}}>
      {/* HERO */}
      <div style={{background:`linear-gradient(180deg,#001A0A 0%,${T.bg} 100%)`,borderBottom:`1px solid ${T.green}33`,padding:"18px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.green,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>🗺 Market Guide</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.55rem",letterSpacing:1,color:T.text,lineHeight:1.05,marginBottom:4}}>{data.market_name}</div>
            <div style={{fontSize:"0.7rem",color:T.muted,marginBottom:8}}>{data.location}</div>
            {data.hours&&<div style={{fontSize:"0.68rem",color:T.text,marginBottom:8}}><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginRight:6}}>Hours</span>{data.hours}</div>}
          </div>
          <div style={{background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:8,padding:"10px 14px",textAlign:"center",flexShrink:0}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:T.green,lineHeight:1}}>{vendors.length}</div>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:T.green,textTransform:"uppercase",opacity:.7}}>Vendors</div>
          </div>
        </div>
        {data.vibe&&<div style={{fontSize:"0.73rem",color:T.muted,lineHeight:1.6,padding:"9px 12px",background:`${T.green}08`,border:`1px solid ${T.green}22`,borderRadius:6}}>{data.vibe}</div>}
      </div>

      {/* VENDOR LIST */}
      <div style={{padding:"14px 16px 60px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",marginBottom:4,fontWeight:600}}>
          Best thing at each vendor — ranked by food quality
        </div>

        {vendors.filter((v):v is Vendor=>v!=null).map((v,i)=>(
          <div key={i} style={{background:T.card,border:`1px solid ${i===0?T.green+"55":T.border}`,borderRadius:8,padding:"12px 13px",boxShadow:i===0?`0 0 12px ${T.green}0D`:"none"}}>
            {/* VENDOR HEADER */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:7}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                  {i===0&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.36rem",letterSpacing:3,color:T.green,textTransform:"uppercase",fontWeight:700,background:`${T.green}15`,border:`1px solid ${T.green}44`,padding:"1px 6px",borderRadius:10,flexShrink:0}}>⭐ Top Pick</span>}
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.05rem",letterSpacing:0.5,color:T.text,lineHeight:1.1}}>{v?.name||""}</div>
                </div>
                <div style={{fontSize:"0.62rem",color:T.muted,letterSpacing:0.3}}>{v?.specialty||""}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.82rem",fontWeight:700,color:scoreClr(v.food_score??0),lineHeight:1}}>{(v?.food_score??0).toFixed(1)}</div>
                {v.price_range&&<div style={{display:"flex",gap:0}}>{["$","$","$","$"].map((_,pi)=><span key={pi} style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.6rem",fontWeight:700,color:pi<["$","$$","$$$","$$$$"].indexOf(v.price_range??"")+1?T.neon:T.dim}}>$</span>)}</div>}
              </div>
            </div>

            {/* THE ORDER */}
            <div style={{background:T.card2,border:`1px solid ${T.neon}2A`,borderRadius:6,padding:"8px 10px",marginBottom:v.insider_note?7:0}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.36rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",marginBottom:3,fontWeight:600,opacity:.8}}>Order this</div>
              <div style={{fontSize:"0.92rem",fontWeight:800,color:T.neon,marginBottom:4,lineHeight:1.2,wordBreak:"break-word"}}>{v?.the_order||""}</div>
              <div style={{fontSize:"0.68rem",color:T.text,lineHeight:1.55}}>{v?.why||""}</div>
            </div>

            {/* INSIDER NOTE */}
            {v?.insider_note&&<div style={{fontSize:"0.67rem",color:T.blue,background:`${T.blue}0D`,border:`1px solid ${T.blue}2A`,borderRadius:5,padding:"5px 9px",marginTop:7}}>💡 {v.insider_note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARE NEARBY RESULT ────────────────────────────────────────────────────
function CompareResult({data,originalScore,onDeepDive}:{
  data:CompareData;originalScore?:number;onDeepDive:(name:string,city:string)=>void;
}){
  const alts=(Array.isArray(data.alternatives)?data.alternatives:[]).filter((a):a is Alternative=>a!=null);
  const scoreClr=(s:number)=>s>=8?"#2ECC71":s>=7?"#FFB800":s>=6?"#FF6B35":"#FF4444";
  const isAny=data._mode==="any";
  const accentClr=isAny?T.green:T.blue;

  return(
    <div style={{background:T.bg}}>
      {/* HEADER */}
      <div style={{background:`linear-gradient(180deg,#00001A 0%,${T.bg} 100%)`,borderBottom:`1px solid ${accentClr}33`,padding:"16px 16px"}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:accentClr,textTransform:"uppercase",marginBottom:5,fontWeight:600}}>{isAny?"🌎 Best Food Nearby":"🔍 Similar Spots Nearby"}</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.3rem",letterSpacing:1,color:T.text,lineHeight:1.1,marginBottom:4}}>
          {isAny?"Best food near":"Similar spots near"} <span style={{color:accentClr}}>{data.original?.name}</span>
        </div>
        <div style={{fontSize:"0.68rem",color:T.muted,marginBottom:6}}>{data.search_area}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:`${accentClr}11`,border:`1px solid ${accentClr}33`,borderRadius:6,padding:"7px 12px"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.38rem",letterSpacing:2,color:accentClr,textTransform:"uppercase"}}>You're looking at</div>
          <div style={{fontSize:"0.85rem",fontWeight:700,color:T.text}}>{data.original?.name}</div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.75rem",fontWeight:700,color:scoreClr(originalScore??0)}}>{(originalScore??0).toFixed(1)}</div>
        </div>
      </div>

      {/* ALTERNATIVES */}
      <div style={{padding:"12px 16px 60px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",marginBottom:2,fontWeight:600}}>
          {isAny?"All cuisines — ranked by food quality":"Same cuisine — ranked by food quality"} · tap to deep dive
        </div>
        {alts.map((a,i)=>{
          const delta=a?.food_score!=null&&originalScore!=null?a.food_score-originalScore:null;
          const deltaStr=delta!=null?(delta>0.2?`+${delta.toFixed(1)} better`:delta<-0.2?`${delta.toFixed(1)} lower`:"≈ similar"):"";
          const deltaClr=(delta??0)>0.2?T.green:(delta??0)<-0.2?T.red:T.muted;
          return(
            <div key={i} style={{background:T.card,border:`1px solid ${i===0?T.blue+"44":T.border}`,borderRadius:8,padding:"12px 13px",boxShadow:i===0?`0 0 12px ${T.blue}11`:"none"}}>
              {/* TOP ROW */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2,flexWrap:"wrap"}}>
                    {i===0&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.35rem",letterSpacing:3,color:T.blue,textTransform:"uppercase",fontWeight:700,background:`${T.blue}18`,border:`1px solid ${T.blue}44`,padding:"1px 6px",borderRadius:10,flexShrink:0}}>Top Alternative</span>}
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.05rem",letterSpacing:0.5,color:T.text,lineHeight:1.1,wordBreak:"break-word"}}>{a?.name||""}</div>
                  </div>
                  <div style={{fontSize:"0.62rem",color:T.muted,marginBottom:4}}>{[a?.neighborhood,a?.cuisine].filter(Boolean).join(" · ")}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                    {a?.venue_type&&<VenueBadge type={a.venue_type}/>}
                    {deltaStr&&<span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.56rem",fontWeight:700,color:deltaClr}}>{deltaStr}</span>}
                    {a?.price_range&&<PriceTag price={a.price_range}/>}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                  <ScoreRing score={a?.food_score??5} size={48}/>
                  <a href={gURL(a?.name??"",a?.neighborhood,"")} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:"0.52rem",color:T.blue,textDecoration:"none",fontFamily:"'IBM Plex Mono',monospace",letterSpacing:1}}>📸</a>
                </div>
              </div>

              {/* VERDICT VS ORIGINAL */}
              <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.35rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",marginBottom:3,fontWeight:600}}>vs {data.original?.name}</div>
                <div style={{fontSize:"0.72rem",color:T.text,lineHeight:1.55}}>{a?.verdict_vs_original||""}</div>
              </div>

              {/* GO HERE IF */}
              {a?.go_here_if&&<div style={{fontSize:"0.68rem",color:T.purple,background:`${T.purple}0D`,border:`1px solid ${T.purple}2A`,borderRadius:5,padding:"6px 9px",marginBottom:8}}>
                <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.34rem",letterSpacing:2,textTransform:"uppercase",fontWeight:700,opacity:.7,marginRight:5}}>Pick this if</span>
                {a.go_here_if}
              </div>}

              {/* MUST ORDER */}
              {a?.must_order&&<div style={{background:`linear-gradient(135deg,#111827,#1F2937)`,border:`1px solid ${T.neon}22`,borderRadius:6,padding:"9px 11px",marginBottom:8}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.34rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",marginBottom:3,opacity:.8}}>⭐ Order this</div>
                <div style={{fontSize:"0.9rem",fontWeight:800,color:T.neon,marginBottom:3,lineHeight:1.2}}>{a.must_order}</div>
                <div style={{fontSize:"0.66rem",color:"#9CA3AF",lineHeight:1.5}}>{a?.must_order_why||""}</div>
              </div>}

              {/* ACTIONS */}
              <div style={{display:"flex",gap:7}}>
                <button onClick={()=>onDeepDive(a?.name??"","")} style={{flex:1,background:`${T.blue}15`,border:`1px solid ${T.blue}44`,color:T.blue,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"7px 10px",borderRadius:5,cursor:"pointer"}}>
                  📍 Deep Dive
                </button>
                {(a?.address||a?.name)&&<a href={dirURL(a?.address,a?.name??"","")} target="_blank" rel="noopener noreferrer"
                  style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:`${T.green}11`,border:`1px solid ${T.green}33`,color:T.green,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"7px 10px",borderRadius:5,textDecoration:"none"}}>
                  🗺 Directions
                </a>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NarrowingFlow({questions,dish,onComplete}:{
  questions:NarrowQuestion[];dish:string;onComplete:(refined:string)=>void;
}){
  const [stepIdx,setStepIdx]=useState(0);
  const [answers,setAnswers]=useState<string[]>([]);
  const current=questions[stepIdx];
  if(!current)return null;

  const pick=(opt:string)=>{
    const next=[...answers,opt];
    setAnswers(next);
    if(stepIdx<questions.length-1) setStepIdx(stepIdx+1);
    else onComplete([dish,...next].filter(Boolean).join(" — "));
  };

  return(
    <div style={{padding:"14px 16px",background:T.card,borderBottom:`1px solid ${T.border}`}}>
      {answers.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:11}}>
        {answers.map((a,i)=><span key={i} style={{background:`${T.neon}18`,border:`1px solid ${T.neon}44`,color:T.neon,fontSize:"0.62rem",fontWeight:600,padding:"2px 8px",borderRadius:20}}>{a}</span>)}
      </div>}
      <div style={{fontSize:"0.9rem",fontWeight:700,color:T.text,marginBottom:12}}>
        <span style={{color:T.neon}}>→ </span>{current.question}
        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginLeft:10}}>step {stepIdx+1} of {questions.length}</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
        {(Array.isArray(current.options)?current.options:[]).map((opt,i)=>(
          <button key={i} onClick={()=>pick(opt)} style={{border:`1.5px solid ${T.border2}`,background:T.card2,color:T.muted,fontFamily:"'Inter',sans-serif",fontSize:"0.78rem",fontWeight:500,padding:"7px 13px",cursor:"pointer",borderRadius:20,transition:"all .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.neon;e.currentTarget.style.color=T.neon;e.currentTarget.style.background=`${T.neon}18`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.muted;e.currentTarget.style.background=T.card2;}}
          >{opt}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>onComplete([dish,...answers].filter(Boolean).join(" "))} style={{border:`1px solid ${T.blue}44`,background:`${T.blue}11`,color:T.blue,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:2,textTransform:"uppercase",padding:"6px 12px",cursor:"pointer",borderRadius:20}}>
          Skip → Search now
        </button>
        {stepIdx>0&&<button onClick={()=>{setStepIdx(stepIdx-1);setAnswers(answers.slice(0,-1));}} style={{border:"none",background:"none",color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:2,textTransform:"uppercase",cursor:"pointer",padding:"6px 0"}}>
          ← Back a step
        </button>}
      </div>
    </div>
  );
}


function FavsPanel({favs,onDeepDive,onRemove}:{
  favs:Fav[];onDeepDive:(name:string)=>void;onRemove:(name:string)=>void;
}){
  if(!favs.length)return(
    <div style={{padding:"50px 16px",textAlign:"center"}}>
      <div style={{fontSize:"2rem",marginBottom:10}}>🤍</div>
      <div style={{fontSize:"0.8rem",color:T.muted,lineHeight:1.7}}>No saved spots yet.<br/>Tap 🤍 on any result to save it here.</div>
    </div>
  );
  return<div>{favs.map((f,i)=>(
    <div key={i} style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"13px 16px",display:"flex",alignItems:"center",gap:12}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"0.93rem",fontWeight:700,color:T.text,marginBottom:3}}>{f.name}</div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          {f.neighborhood&&<span style={{fontSize:"0.67rem",color:T.muted}}>{f.neighborhood}</span>}
          {f.price_range&&<PriceTag price={f.price_range}/>}
          {f.venue_type&&<VenueBadge type={f.venue_type}/>}
        </div>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center",flexShrink:0}}>
        <button onClick={()=>onDeepDive(f.name)} style={{background:`${T.blue}15`,border:`1px solid ${T.blue}44`,color:T.blue,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"5px 9px",borderRadius:4,cursor:"pointer"}}>Deep Dive</button>
        <button onClick={()=>onRemove(f.name)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",padding:0}}>❤️</button>
      </div>
    </div>
  ))}</div>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const RADII=[2,5,10,25];
const STEPS=["Searching restaurants","Pulling reviews","Filtering noise","Extracting food signal","Scoring & ranking"];


function DishIntel(){
  const router=useRouter();
  const searchParams=useSearchParams();
  const [tab,setTab]=useState("search");
  const [dish,setDish]=useState("");
  const [city,setCity]=useState("San Diego");
  const [locMode,setLocMode]=useState("city");
  const [area,setArea]=useState("");
  const [radius,setRadius]=useState(5);
  const [ddName,setDdName]=useState("");
  const [ddCity,setDdCity]=useState("San Diego");
  const [confirmMatches,setConfirmMatches]=useState<ConfirmMatch[]|null>(null);
  const [confirming,setConfirming]=useState(false);
  const [phase,setPhase]=useState("idle");
  const [narrowQuestions,setNarrowQuestions]=useState<NarrowQuestion[]|null>(null);
  const [restaurants,setRestaurants]=useState<Restaurant[]>([]);
  const [meta,setMeta]=useState<SearchMeta|null>(null);
  const [searchedDish,setSearchedDish]=useState("");
  const [deepData,setDeepData]=useState<DeepDiveData|null>(null);
  const [compareData,setCompareData]=useState<CompareData|null>(null);
  const [marketData,setMarketData]=useState<MarketData|null>(null);
  const [confirmIsMarket,setConfirmIsMarket]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [errMsg,setErrMsg]=useState("");
  const [expanded,setExpanded]=useState<number|null>(null);
  const [lstep,setLstep]=useState(0);
  const [favs,setFavs]=useState<Fav[]>([]);
  const [navStack,setNavStack]=useState<NavEntry[]>([]);
  const [user,setUser]=useState<UserType>(null);
  const [showUserMenu,setShowUserMenu]=useState(false);
  const [addToListTarget,setAddToListTarget]=useState<AddToListTarget|null>(null);
  const [userLists,setUserLists]=useState<UserList[]>([]);
  const [loadingLists,setLoadingLists]=useState(false);
  const [newListName,setNewListName]=useState("");
  const [savingList,setSavingList]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{try{const r=localStorage.getItem("di-favs");if(r)setFavs(JSON.parse(r));}catch{}},[]);

  useEffect(()=>{
    const client=sb();
    client.auth.getUser().then((res:{data:{user:User|null}})=>setUser(res.data.user));
    const {data:{subscription}}=client.auth.onAuthStateChange((_event:string,session:Session|null)=>setUser(session?.user??null));
    return ()=>subscription.unsubscribe();
  },[]);

  // Handle URL params from re-search (dashboard searches page)
  const autoSearchFired=useRef(false);
  useEffect(()=>{
    if(autoSearchFired.current)return;
    const d=searchParams.get("dish"),c=searchParams.get("city"),lm=searchParams.get("locMode"),a=searchParams.get("area"),r=searchParams.get("radius"),auto=searchParams.get("autoSearch");
    if(!d||!auto)return;
    autoSearchFired.current=true;
    if(c)setCity(c);if(lm)setLocMode(lm);if(a)setArea(a);if(r)setRadius(Number(r));
    setDish(d);
    setTimeout(()=>runSearch(d),100);
  },[searchParams]);

  // Close user menu on outside click
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setShowUserMenu(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);
  const saveFavs=(next:Fav[])=>{setFavs(next);try{localStorage.setItem("di-favs",JSON.stringify(next));}catch{}};
  const isFav=(name:string)=>favs.some(f=>f.name===name);
  const toggleFav=(r:{name:string;neighborhood?:string;venue_type?:string;price_range?:string;food_score?:number})=>{const next=isFav(r.name)?favs.filter(f=>f.name!==r.name):[...favs,{name:r.name,neighborhood:r.neighborhood,venue_type:r.venue_type,price_range:r.price_range,food_score:r.food_score}];saveFavs(next);};

  const pushNav=()=>{
    if(["done","deepdone","marketdone","comparedone"].includes(phase)){
      setNavStack(prev=>[...prev,{phase,restaurants:[...restaurants],meta,searchedDish,deepData,compareData,marketData,expanded,tab}]);
    }
  };

  const goBack=()=>{
    if(navStack.length===0){reset();return;}
    const prev=navStack[navStack.length-1];
    setNavStack(s=>s.slice(0,-1));
    setPhase(prev.phase);
    setRestaurants(prev.restaurants||[]);
    setMeta(prev.meta||null);
    setSearchedDish(prev.searchedDish||"");
    setDeepData(prev.deepData||null);
    setCompareData(prev.compareData||null);
    setMarketData(prev.marketData||null);
    setExpanded(prev.expanded);
    setTab(prev.tab||"search");
    setErrMsg("");
    setNarrowQuestions(null);
  };

  const reset=()=>{setPhase("idle");setNarrowQuestions(null);setRestaurants([]);setMeta(null);setSearchedDish("");setDeepData(null);setCompareData(null);setMarketData(null);setConfirmIsMarket(false);setErrMsg("");setExpanded(null);setConfirmMatches(null);setNavStack([]);};

  const openAddToList=(target:AddToListTarget)=>{
    if(!user){router.push("/auth/signin");return;}
    setAddToListTarget(target);setNewListName("");
    if(userLists.length===0){
      setLoadingLists(true);
      sb().from("lists").select("id,name").order("created_at",{ascending:false}).limit(20)
        .then((res:{data:UserList[]|null})=>{setUserLists(res.data??[]);setLoadingLists(false);},(()=>setLoadingLists(false)));
    }
  };

  const addToList=async(listId:string)=>{
    if(!addToListTarget)return;
    setSavingList(true);
    const {data:{user:u}}=await sb().auth.getUser();
    if(!u){setSavingList(false);return;}
    await sb().from("list_items").upsert({
      list_id:listId,user_id:u.id,
      restaurant_name:addToListTarget.name,
      neighborhood:addToListTarget.neighborhood||null,
      venue_type:addToListTarget.venue_type||null,
      price_range:addToListTarget.price_range||null,
      food_score:addToListTarget.food_score||null,
      cuisine:addToListTarget.cuisine||null,
    },{onConflict:"list_id,restaurant_name"});
    setSavingList(false);setAddToListTarget(null);
  };

  const createAndAdd=async()=>{
    if(!newListName.trim()||!addToListTarget)return;
    setSavingList(true);
    const {data:{user:u}}=await sb().auth.getUser();
    if(!u){setSavingList(false);return;}
    const {data:list}=await sb().from("lists").insert({name:newListName.trim()}).select().single();
    if(list){
      setUserLists(prev=>[{id:list.id,name:list.name},...prev]);
      await addToList(list.id);
    }
    setSavingList(false);setAddToListTarget(null);setNewListName("");
  };
  const locStr=()=>locMode==="area"&&area.trim()?`within ${radius} miles of ${area.trim()}`:`in ${city}`;
  const buildQ=(d:string,excl:string[]=[])=>`Best places for "${d}" ${locStr()}.${excl.length?` Exclude: ${excl.join(", ")}.`:""} Return JSON.`;

  const runSearch=async(d:string)=>{
    pushNav();
    setPhase("analyzing");setExpanded(null);setLstep(0);setSearchedDish(d);setNarrowQuestions(null);
    const iv=setInterval(()=>setLstep(s=>(s+1)%STEPS.length),3200);
    try{
      const data=await apiFetch("/api/search",{mode:"search",dish:d,city,area,locMode,radius,exclude:[]});
      clearInterval(iv);setMeta({dish:data.dish,city:data.city});
      const res=(Array.isArray(data.results)?data.results:[]) as Restaurant[];
      setRestaurants(res.map((r,i)=>({...r,rank:i+1})));setPhase("done");
    }catch(e){clearInterval(iv);setErrMsg(e instanceof Error?e.message:"Analysis failed");setPhase("error");}
  };

  const loadMore=async()=>{
    if(loadingMore)return;setLoadingMore(true);
    const excl=restaurants.map(r=>r.name);
    try{
      const data=await apiFetch("/api/search",{mode:"search",dish:searchedDish,city,area,locMode,radius,exclude:excl});
      const start=restaurants.length+1;
      const more=(Array.isArray(data.results)?data.results:[]) as Restaurant[];setRestaurants(p=>[...p,...more.map((r,i)=>({...r,rank:start+i}))]);
    }catch{}finally{setLoadingMore(false);}
  };

  const handleCompare=async(radius:number,currentData:DeepDiveData,mode="similar")=>{
    pushNav();
    setPhase("analyzing");setLstep(0);setCompareData(null);setNarrowQuestions(null);
    const loc=currentData?.address||currentData?.neighborhood
      ?`within ${radius} miles of ${currentData?.address||currentData?.neighborhood||"this location"}`
      :`within ${radius} miles`;
    const cuisineCtx = mode==="similar"
      ? `Focus on similar cuisine (${currentData?.cuisine||"same type"}). Compare them on food quality vs the original.`
      : `Include ALL cuisines and restaurant types — rank purely by food quality. Don't limit to similar cuisine.`;
    const iv=setInterval(()=>setLstep(s=>(s+1)%STEPS.length),3200);
    try{
      const data=await apiFetch("/api/compare",{name:currentData?.name,foodScore:currentData?.food_score,cuisine:currentData?.cuisine||"various",radius,location:loc,mode});
      clearInterval(iv);
      setCompareData({...data,_originalScore:currentData?.food_score,_mode:mode});
      setPhase("comparedone");
    }catch(e){clearInterval(iv);setErrMsg(e instanceof Error?e.message:"Comparison failed");setPhase("error");}
  };

  const handleSearch=async()=>{
    if(!dish.trim()||(locMode==="area"&&!area.trim()))return;
    setNarrowQuestions(null);setPhase("classifying");
    try{
      const cls=await apiFetch("/api/search",{mode:"classify",dish});
      if(cls.broad&&cls.questions?.length){setNarrowQuestions(cls.questions);setPhase("narrowing");}
      else await runSearch(dish);
    }catch{await runSearch(dish);}
  };

  const handleBrowse=(d:string)=>{setDish(d);setNarrowQuestions(null);runSearch(d);};

  const handleConfirm=async()=>{
    if(!ddName.trim())return;setConfirming(true);setConfirmMatches(null);setConfirmIsMarket(false);
    try{
      const data=await apiFetch("/api/deepdive",{mode:"confirm",name:ddName,city:ddCity});
      setConfirmIsMarket(!!data.is_market);
      setConfirmMatches(data.matches||[]);
    }catch{setConfirmMatches([{name:ddName,address:"",city:ddCity,neighborhood:"",cuisine:""}]);}
    finally{setConfirming(false);}
  };

  const handleMarketGuide=async(name:string|undefined,cityStr?:string)=>{
    pushNav();
    const c=cityStr||ddCity;setConfirmMatches(null);setPhase("analyzing");setLstep(0);setTab("deepdive");setNarrowQuestions(null);
    const iv=setInterval(()=>setLstep(s=>(s+1)%STEPS.length),3200);
    try{
      const data=await apiFetch("/api/market",{name,city:c});
      clearInterval(iv);setMarketData({...data,vendors:Array.isArray(data.vendors)?data.vendors:[]});setPhase("marketdone");
    }catch(e){clearInterval(iv);setErrMsg(e instanceof Error?e.message:"Market guide failed");setPhase("error");}
  };

  const handleDeepDive=async(name:string,cityStr?:string)=>{
    pushNav();
    const c=cityStr||ddCity;setConfirmMatches(null);setPhase("analyzing");setLstep(0);setTab("deepdive");setNarrowQuestions(null);
    const iv=setInterval(()=>setLstep(s=>(s+1)%STEPS.length),3200);
    try{
      const data=await apiFetch("/api/deepdive",{mode:"deepdive",name,city:c});
      clearInterval(iv);setDeepData(data);setPhase("deepdone");
    }catch(e){clearInterval(iv);setErrMsg(e instanceof Error?e.message:"Deep dive failed");setPhase("error");}
  };

  const isIdle=["idle","done","error","deepdone","marketdone","comparedone"].includes(phase);
  const locOk=locMode==="city"?!!city.trim():!!area.trim();
  const canSearch=dish.trim()&&isIdle&&locOk;
  const showInputs=["idle","narrowing","classifying"].includes(phase);
  const hasBack=navStack.length>0;

  const BackBtn=()=><button onClick={goBack} style={{display:"flex",alignItems:"center",gap:4,background:"transparent",border:`1px solid ${T.border2}`,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 9px",borderRadius:4,cursor:"pointer",flexShrink:0,transition:"all .15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=T.neon;e.currentTarget.style.color=T.neon;}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border2;e.currentTarget.style.color=T.muted;}}
  >← Back</button>;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{overflow-x:hidden;background:${T.bg}}
        .app{min-height:100vh;background:${T.bg};color:${T.text};font-family:'Inter',sans-serif;width:100%;overflow-x:hidden}
        .slbl{font-family:'IBM Plex Mono',monospace;font-size:0.44rem;letter-spacing:3px;color:${T.dim};text-transform:uppercase;margin-bottom:8px;font-weight:600}
        .prow{display:flex;gap:6px;flex-wrap:wrap}
        .inp{background:${T.card};border:1.5px solid ${T.border2};color:${T.text};font-family:'Inter',sans-serif;font-size:0.88rem;font-weight:500;padding:10px 12px;outline:none;border-radius:6px;transition:border-color .15s,box-shadow .15s;width:100%}
        .inp:focus{border-color:${T.neon};box-shadow:0 0 0 3px ${T.neonGlow}}
        .inp::placeholder{color:${T.dim};font-weight:400}
        .btn{background:${T.neon};color:#000;border:none;font-family:'Bebas Neue',sans-serif;font-size:1rem;letter-spacing:2px;padding:0 18px;height:42px;cursor:pointer;border-radius:6px;transition:all .15s;flex-shrink:0;box-shadow:0 0 12px ${T.neonGlow}}
        .btn:hover:not(:disabled){background:#FFD033;box-shadow:0 0 20px ${T.neon}66}
        .btn:disabled{opacity:.35;cursor:not-allowed;box-shadow:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{width:12px;height:12px;border:2px solid ${T.border2};border-top-color:${T.neon};border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes up{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
      `}</style>

      <div className="app">
        {/* HEADER */}
        <div style={{background:T.card,padding:"0 16px",display:"flex",alignItems:"center",gap:11,height:50,borderBottom:`1px solid ${T.neon}44`,boxShadow:`0 0 20px ${T.neon}22`}}>
          {hasBack&&<BackBtn/>}
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.5rem",letterSpacing:3,color:T.neon,lineHeight:1,flexShrink:0,textShadow:`0 0 12px ${T.neon}88`}}>DISH REPORT</div>
          <div style={{width:1,height:18,background:T.border2,flexShrink:0}}/>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",lineHeight:1.9,flex:1}}>Where the food stands out</div>
          <button onClick={()=>{if(phase==="done"||phase==="deepdone")pushNav();setPhase("idle");setTab("favs");}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.95rem",padding:0,lineHeight:1}} title="Saved spots">{favs.length>0?"❤️":"🤍"}</button>
          {user?(
            <div ref={menuRef} style={{position:"relative",flexShrink:0}}>
              <button onClick={()=>setShowUserMenu(v=>!v)} style={{background:`${T.neon}18`,border:`1px solid ${T.neon}44`,borderRadius:"50%",width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700,color:T.neon,fontFamily:"'IBM Plex Mono',monospace"}}>
                {(user.email?.[0]||"U").toUpperCase()}
              </button>
              {showUserMenu&&<div style={{position:"absolute",top:38,right:0,background:T.card,border:`1px solid ${T.border2}`,borderRadius:8,width:180,zIndex:100,boxShadow:`0 4px 24px #000A`,overflow:"hidden"}}>
                <div style={{padding:"8px 12px",borderBottom:`1px solid ${T.border}`,fontSize:"0.62rem",color:T.muted,fontFamily:"'IBM Plex Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email}</div>
                {[["My Searches","🔍","/dashboard/searches"],["My Lists","📋","/dashboard/lists"]].map(([label,icon,href])=>(
                  <button key={href} onClick={()=>{setShowUserMenu(false);router.push(href);}} style={{width:"100%",background:"none",border:"none",borderBottom:`1px solid ${T.border}`,padding:"10px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:T.text,fontSize:"0.78rem",textAlign:"left"}}>
                    <span>{icon}</span><span>{label}</span>
                  </button>
                ))}
                <button onClick={async()=>{await sb().auth.signOut();setShowUserMenu(false);setUser(null);}} style={{width:"100%",background:"none",border:"none",padding:"10px 12px",display:"flex",alignItems:"center",gap:8,cursor:"pointer",color:T.red,fontSize:"0.78rem",textAlign:"left"}}>
                  <span>🚪</span><span>Sign Out</span>
                </button>
              </div>}
            </div>
          ):(
            <button onClick={()=>router.push("/auth/signin")} style={{background:"none",border:`1px solid ${T.border2}`,borderRadius:5,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"5px 9px",cursor:"pointer",flexShrink:0}}>Sign In</button>
          )}
        </div>

        {/* HERO */}
        {phase==="idle"&&tab!=="favs"&&(
          <div style={{background:`linear-gradient(180deg, #1A1400 0%, ${T.bg} 100%)`,borderBottom:`1px solid ${T.border}`,padding:"20px 16px"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.9rem",letterSpacing:1,color:T.text,lineHeight:1.0,marginBottom:6}}>Find where the<br/><span style={{color:T.neon,textShadow:`0 0 16px ${T.neon}66`}}>food stands out.</span></div>
            <div style={{fontSize:"0.76rem",color:T.muted,lineHeight:1.65,marginBottom:12,maxWidth:440}}>Real signal from real reviews — must-order dishes, honest scores, and what to expect walking in.</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["🏚 Hole-in-the-wall gems","✨ Upscale worth it","⭐ Specific must-orders","✗ What to skip"].map(t=>(
                <span key={t} style={{background:T.card,border:`1px solid ${T.border2}`,color:T.muted,fontSize:"0.62rem",fontWeight:500,padding:"3px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* INPUT PANEL */}
        {showInputs&&(
          <div style={{background:T.card,borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
              {[["search","🔍 Search"],["browse","🗂 Browse"],["deepdive","📍 A Spot"],["favs","❤️"]].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:"none",border:"none",borderBottom:`2px solid ${tab===t?T.neon:"transparent"}`,color:tab===t?T.neon:T.dim,fontFamily:"'Inter',sans-serif",fontSize:"0.68rem",fontWeight:700,padding:"9px 3px",cursor:"pointer",transition:"all .15s",textAlign:"center"}}>{l}</button>
              ))}
            </div>

            <div style={{padding:"14px 16px"}}>
              {/* LOCATION */}
              {tab!=="deepdive"&&tab!=="favs"&&<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:13,background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 12px"}}>
                <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                  <div style={{display:"inline-flex",border:`1.5px solid ${T.border2}`,borderRadius:6,overflow:"hidden",flexShrink:0}}>
                    {["city","area"].map(m=><button key={m} onClick={()=>setLocMode(m)} style={{background:locMode===m?T.neon:T.card2,border:"none",color:locMode===m?"#000":T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.48rem",letterSpacing:2,textTransform:"uppercase",padding:"7px 10px",cursor:"pointer",borderRight:m==="city"?`1px solid ${T.border2}`:"none",fontWeight:locMode===m?700:400}}>{m==="city"?"City":"By Area"}</button>)}
                  </div>
                  {locMode==="city"?<input className="inp" style={{flex:1}} placeholder="San Diego" value={city} onChange={e=>setCity(e.target.value)}/>:<input className="inp" style={{flex:1}} placeholder="Burbank, North Park, Silver Lake..." value={area} onChange={e=>setArea(e.target.value)}/>}
                </div>
                {locMode==="area"&&<div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase"}}>Within</span>
                  {RADII.map(r=><button key={r} onClick={()=>setRadius(r)} style={{border:`1.5px solid ${radius===r?T.neon:T.border2}`,background:radius===r?`${T.neon}18`:T.card2,color:radius===r?T.neon:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.54rem",padding:"4px 9px",cursor:"pointer",borderRadius:20,fontWeight:radius===r?700:400,boxShadow:radius===r?`0 0 6px ${T.neon}44`:"none"}}>{r} mi</button>)}
                </div>}
              </div>}

              {tab==="search"&&<div style={{display:"flex",gap:8}}>
                <input className="inp" placeholder="carnitas, ramen, smash burger, khao soi..." value={dish} onChange={e=>setDish(e.target.value)} onKeyDown={e=>e.key==="Enter"&&canSearch&&handleSearch()} disabled={!isIdle}/>
                <button className="btn" onClick={handleSearch} disabled={!canSearch}>FIND</button>
              </div>}

              {tab==="browse"&&(locOk?<Browse onSelect={handleBrowse} disabled={!isIdle}/>:<div style={{fontSize:"0.75rem",color:T.muted}}>Enter a city or area above first.</div>)}

              {tab==="deepdive"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:"0.76rem",color:T.muted,lineHeight:1.55}}>Know where you're going? Enter a restaurant for a food cheat sheet, or a food court / public market for a vendor-by-vendor guide.</div>
                <div style={{display:"flex",gap:7}}>
                  <input className="inp" placeholder="Restaurant name..." value={ddName} onChange={e=>setDdName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ddName.trim()&&handleConfirm()} disabled={!isIdle||confirming} style={{flex:2}}/>
                  <input className="inp" placeholder="City" value={ddCity} onChange={e=>setDdCity(e.target.value)} disabled={!isIdle||confirming} style={{flex:1}}/>
                </div>
                <button className="btn" onClick={handleConfirm} disabled={!ddName.trim()||!isIdle||confirming} style={{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:6}}>
                  {confirming?<><div className="spin"/>Finding...</>:"CONFIRM SPOT"}
                </button>
                {Array.isArray(confirmMatches)&&confirmMatches.length>0&&<div style={{marginTop:4}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:3,color:T.dim,textTransform:"uppercase",marginBottom:9}}>Is this the right spot?</div>
                  {confirmMatches.map((m,i)=>(
                    <div key={i} style={{background:T.card2,border:`1.5px solid ${T.border2}`,borderRadius:7,padding:"11px 13px",marginBottom:8}}>
                      <div style={{fontSize:"0.9rem",fontWeight:700,color:T.text,marginBottom:3}}>{m.name}</div>
                      <div style={{fontSize:"0.69rem",color:T.muted,marginBottom:8}}>{[m.address,m.neighborhood,m.city].filter(Boolean).join(" · ")}</div>
                      {m.cuisine&&<div style={{fontSize:"0.64rem",color:T.dim,marginBottom:10}}>{m.cuisine}</div>}
                      {/* CHOICE BUTTONS */}
                      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                        <button onClick={()=>handleDeepDive(m.name,m.city||ddCity)}
                          style={{flex:1,minWidth:120,background:`${T.neon}15`,border:`1px solid ${T.neon}55`,color:T.neon,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:2,textTransform:"uppercase",padding:"8px 10px",borderRadius:5,cursor:"pointer",textAlign:"center",lineHeight:1.4}}>
                          📍 Restaurant<br/>Deep Dive
                        </button>
                        <button onClick={()=>handleMarketGuide(m.name,m.city||ddCity)}
                          style={{flex:1,minWidth:120,background:`${T.green}15`,border:`1px solid ${T.green}55`,color:T.green,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:2,textTransform:"uppercase",padding:"8px 10px",borderRadius:5,cursor:"pointer",textAlign:"center",lineHeight:1.4}}>
                          🗺 Market Guide<br/>All Vendors
                        </button>
                      </div>
                      {confirmIsMarket&&<div style={{marginTop:7,fontSize:"0.6rem",color:T.green,fontFamily:"'IBM Plex Mono',monospace",letterSpacing:1}}>✓ Looks like a market or multi-vendor spot</div>}
                    </div>
                  ))}
                  <button onClick={()=>setConfirmMatches(null)} style={{background:"none",border:"none",fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",cursor:"pointer",padding:0}}>← Try a different name</button>
                </div>}
              </div>}
            </div>
          </div>
        )}

        {/* CLASSIFYING */}
        {phase==="classifying"&&<div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:9,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.5rem",letterSpacing:3,color:T.dim,textTransform:"uppercase"}}><div className="spin"/>Reading your query...</div>}

        {/* MULTI-STEP NARROWING */}
        {phase==="narrowing"&&narrowQuestions&&(
          <NarrowingFlow questions={narrowQuestions} dish={dish} onComplete={refined=>runSearch(refined)}/>
        )}

        {/* ANALYZING */}
        {phase==="analyzing"&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"52px 16px",gap:14}}>
          <div style={{display:"flex",flexDirection:"column",gap:10,width:215}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:9,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.5rem",letterSpacing:2,textTransform:"uppercase",color:i===lstep?T.neon:i<lstep?T.muted:T.dim,transition:"color .3s"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"currentColor",flexShrink:0,display:"block",animation:i===lstep?"pulse 1s infinite":undefined,boxShadow:i===lstep?`0 0 6px ${T.neon}`:"none"}}/>
                {s}
              </div>
            ))}
          </div>
        </div>}

        {phase==="error"&&<div style={{padding:"14px 16px",fontSize:"0.76rem",color:T.red,background:`${T.red}11`,borderLeft:`3px solid ${T.red}`,margin:"12px 16px",borderRadius:"0 5px 5px 0"}}>⚠ {errMsg}</div>}

        {/* FAVS */}
        {tab==="favs"&&phase==="idle"&&(
          <>
            <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:9}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.1rem",letterSpacing:2,color:T.neon}}>❤️ Saved Spots</div>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,color:T.dim,textTransform:"uppercase"}}>{favs.length} saved</div>
              <button onClick={()=>setTab("search")} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${T.border2}`,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 8px",borderRadius:4,cursor:"pointer"}}>← Search</button>
            </div>
            <FavsPanel favs={favs} onDeepDive={n=>handleDeepDive(n,ddCity)} onRemove={n=>saveFavs(favs.filter(f=>f.name!==n))}/>
          </>
        )}

        {/* RESULTS */}
        {phase==="done"&&meta&&<>
          <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.2rem",letterSpacing:2,color:T.text}}>{meta.dish?.toUpperCase()} — <span style={{color:T.neon}}>{meta.city?.toUpperCase()}</span></div>
            <div style={{background:T.card2,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"3px 7px",borderRadius:4}}>{restaurants.length} results</div>
            {hasBack&&<BackBtn/>}
            <button onClick={reset} style={{marginLeft:hasBack?"0":"auto",background:"transparent",border:`1px solid ${T.border2}`,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 8px",borderRadius:4,cursor:"pointer"}}>New search</button>
          </div>
          {restaurants.filter(r=>r!=null).map((r,i)=><RestCard key={i} r={r} i={i} expanded={expanded} onToggle={j=>setExpanded(expanded===j?null:j)} onDeepDive={name=>handleDeepDive(name,meta.city)} meta={meta} searchedDish={searchedDish} isFav={isFav(r.name)} onToggleFav={toggleFav} onAddToList={openAddToList}/>)}
          <div style={{padding:"16px",display:"flex",justifyContent:"center"}}>
            <button onClick={loadMore} disabled={loadingMore} style={{background:T.card,border:`1.5px solid ${T.border2}`,color:T.muted,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.5rem",letterSpacing:2,textTransform:"uppercase",padding:"10px 24px",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all .15s"}}>
              {loadingMore?<><div className="spin"/>Loading...</>:"Load 5 more results"}
            </button>
          </div>
        </>}

        {/* DEEP DIVE */}
        {phase==="deepdone"&&deepData&&<>
          <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,padding:"11px 16px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:2,color:T.neon}}>📍 Deep Dive</div>
            {hasBack&&<BackBtn/>}
            <button onClick={()=>{reset();setTab("search");}} style={{marginLeft:hasBack?"0":"auto",background:"transparent",border:`1px solid ${T.border2}`,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 8px",borderRadius:4,cursor:"pointer"}}>New search</button>
          </div>
          <DeepDiveResult data={deepData} city={ddCity} isFav={isFav(deepData?.name)} onFav={()=>toggleFav({name:deepData?.name,neighborhood:deepData?.neighborhood,venue_type:deepData?.venue_type,price_range:deepData?.price_range,food_score:deepData?.food_score})} onCompare={handleCompare} onMarket={name=>handleMarketGuide(name,ddCity)} onAddToList={openAddToList}/>
        </>}

        {phase==="comparedone"&&compareData&&<>
          <div style={{background:T.card,borderBottom:`1px solid ${T.blue}44`,padding:"11px 16px",display:"flex",alignItems:"center",gap:8,boxShadow:`0 0 16px ${T.blue}1A`}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:2,color:compareData._mode==="any"?T.green:T.blue}}>{compareData._mode==="any"?"🌎 Best Nearby":"🔍 Similar Spots"}</div>
            {hasBack&&<BackBtn/>}
            <button onClick={()=>{reset();setTab("search");}} style={{marginLeft:hasBack?"0":"auto",background:"transparent",border:`1px solid ${T.border2}`,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 8px",borderRadius:4,cursor:"pointer"}}>New search</button>
          </div>
          <CompareResult data={compareData} originalScore={compareData._originalScore} onDeepDive={(name)=>handleDeepDive(name,ddCity)}/>
        </>}

        {phase==="marketdone"&&marketData&&<>
          <div style={{background:T.card,borderBottom:`1px solid ${T.green}44`,padding:"11px 16px",display:"flex",alignItems:"center",gap:8,boxShadow:`0 0 16px ${T.green}1A`}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1rem",letterSpacing:2,color:T.green}}>🗺 Market Guide</div>
            {hasBack&&<BackBtn/>}
            <button onClick={()=>{reset();setTab("search");}} style={{marginLeft:hasBack?"0":"auto",background:"transparent",border:`1px solid ${T.border2}`,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,textTransform:"uppercase",padding:"4px 8px",borderRadius:4,cursor:"pointer"}}>New search</button>
          </div>
          <MarketGuideResult data={marketData}/>
        </>}
      </div>

      {/* ADD TO LIST MODAL */}
      {addToListTarget&&<div onClick={()=>setAddToListTarget(null)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#000A",zIndex:9000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"14px 14px 0 0",width:"100%",maxWidth:480,padding:"20px 16px",border:`1px solid ${T.border2}`,maxHeight:"80vh",overflowY:"auto"}}>
          <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.46rem",letterSpacing:3,color:T.neon,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Add to List</div>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:T.text,marginBottom:14}}>{addToListTarget.name}</div>

          {/* NEW LIST INPUT */}
          <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:8,padding:"11px 12px",marginBottom:10}}>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginBottom:7}}>Create new list</div>
            <div style={{display:"flex",gap:8}}>
              <input value={newListName} onChange={e=>setNewListName(e.target.value)} placeholder="List name..." onKeyDown={e=>e.key==="Enter"&&newListName.trim()&&createAndAdd()}
                style={{flex:1,background:T.card,border:`1.5px solid ${T.border2}`,borderRadius:5,padding:"8px 10px",color:T.text,fontFamily:"'Inter',sans-serif",fontSize:"0.82rem",outline:"none"}}/>
              <button onClick={createAndAdd} disabled={!newListName.trim()||savingList}
                style={{background:T.neon,border:"none",borderRadius:5,color:"#000",fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.44rem",letterSpacing:2,fontWeight:700,textTransform:"uppercase",padding:"8px 12px",cursor:"pointer",opacity:!newListName.trim()||savingList?.5:1}}>
                {savingList?"...":"Create"}
              </button>
            </div>
          </div>

          {/* EXISTING LISTS */}
          {loadingLists&&<div style={{fontSize:"0.72rem",color:T.muted,padding:"8px 0"}}>Loading lists...</div>}
          {!loadingLists&&userLists.length>0&&<>
            <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.4rem",letterSpacing:2,color:T.dim,textTransform:"uppercase",marginBottom:8}}>Add to existing list</div>
            {userLists.map(l=>(
              <button key={l.id} onClick={()=>addToList(l.id)} disabled={savingList}
                style={{width:"100%",background:T.card2,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 12px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",color:T.text,fontSize:"0.82rem",textAlign:"left",opacity:savingList?.6:1}}>
                <span>{l.name}</span><span style={{color:T.muted,fontSize:"0.7rem"}}>+</span>
              </button>
            ))}
          </>}
          {!loadingLists&&userLists.length===0&&!newListName&&<div style={{fontSize:"0.72rem",color:T.dim,padding:"4px 0"}}>No lists yet — create one above.</div>}

          <button onClick={()=>setAddToListTarget(null)} style={{marginTop:10,width:"100%",background:"none",border:`1px solid ${T.border2}`,borderRadius:6,color:T.dim,fontFamily:"'IBM Plex Mono',monospace",fontSize:"0.42rem",letterSpacing:2,textTransform:"uppercase",padding:"9px",cursor:"pointer"}}>Cancel</button>
        </div>
      </div>}
    </>
  );
}

import { Suspense } from "react";
export default function Page() {
  return (
    <Suspense fallback={<div style={{background:"#0C0C0C",minHeight:"100vh"}}/>}>
      <DishIntel/>
    </Suspense>
  );
}
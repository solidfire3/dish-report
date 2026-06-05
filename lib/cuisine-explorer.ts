// icon: Lucide icon name. Omit to use the default (Utensils).
// Only set when Lucide has a genuinely fitting food icon — ~15 distinct
// out of ~83 cuisines. All others inherit the Utensils default.
export type CuisineEntry = { label: string; dishes: string[]; icon?: string };
export type RegionEntry  = { label: string; cuisines: CuisineEntry[] };

export const CUISINE_EXPLORER: RegionEntry[] = [
  {
    label: "East Asian",
    cuisines: [
      { label: "Japanese",    dishes: ["Ramen", "Sushi", "Tonkatsu", "Yakitori", "Tempura", "Udon", "Okonomiyaki"], icon: "Fish" },
      { label: "Korean",      dishes: ["Korean BBQ", "Bibimbap", "Bulgogi", "Sundubu Jjigae", "Japchae", "Tteokbokki", "Doenjang Jjigae"], icon: "Beef" },
      { label: "Chinese",     dishes: ["Dim Sum", "Peking Duck", "Mapo Tofu", "Kung Pao Chicken", "Hot Pot", "Xiaolongbao", "Dan Dan Noodles"] },
      { label: "Taiwanese",   dishes: ["Beef Noodle Soup", "Scallion Pancake", "Pork Chop Rice", "Braised Pork Rice", "Oyster Vermicelli", "Stinky Tofu"] },
      { label: "Mongolian",   dishes: ["Mongolian BBQ", "Buuz", "Tsuivan", "Khuushuur", "Bantan"] },
      { label: "Tibetan",     dishes: ["Momos", "Thukpa", "Tsampa Porridge", "Balep Flatbread", "Butter Tea Dishes"] },
    ],
  },
  {
    label: "Southeast Asian",
    cuisines: [
      { label: "Thai",        dishes: ["Pad Thai", "Green Curry", "Tom Yum", "Som Tum", "Pad See Ew", "Massaman Curry", "Khao Man Gai"] },
      { label: "Vietnamese",  dishes: ["Pho", "Banh Mi", "Bun Bo Hue", "Goi Cuon", "Bun Cha", "Com Tam", "Banh Xeo"] },
      { label: "Filipino",    dishes: ["Adobo", "Sinigang", "Lechon", "Kare-Kare", "Pancit", "Halo-Halo", "Sisig"] },
      { label: "Indonesian",  dishes: ["Nasi Goreng", "Rendang", "Gado-Gado", "Satay", "Soto Ayam", "Bakso", "Martabak"] },
      { label: "Malaysian",   dishes: ["Nasi Lemak", "Laksa", "Char Kway Teow", "Roti Canai", "Mee Goreng", "Hainanese Chicken Rice"] },
      { label: "Singaporean", dishes: ["Chili Crab", "Chicken Rice", "Char Kway Teow", "Hokkien Mee", "Laksa", "Satay"] },
      { label: "Burmese",     dishes: ["Mohinga", "Laphet Thoke", "Nan Gyi Thoke", "Shan Noodles", "Ohn No Khao Swè"] },
      { label: "Cambodian",   dishes: ["Amok", "Lok Lak", "Kuy Teav", "Num Banh Chok", "Banh Chao"] },
      { label: "Lao",         dishes: ["Larb", "Tam Mak Hoong", "Khao Piak Sen", "Or Lam", "Ping Gai"] },
    ],
  },
  {
    label: "South Asian",
    cuisines: [
      { label: "Indian",        dishes: ["Butter Chicken", "Biryani", "Dosa", "Rogan Josh", "Chaat", "Dal Makhani", "Chole Bhature"] },
      { label: "Pakistani",     dishes: ["Nihari", "Haleem", "Chapli Kebab", "Biryani", "Saag", "Paya", "Karahi"] },
      { label: "Sri Lankan",    dishes: ["Rice & Curry", "Kottu Roti", "Hoppers", "Lamprais", "String Hoppers", "Ambul Thiyal"] },
      { label: "Nepali",        dishes: ["Dal Bhat", "Momos", "Thukpa", "Sekuwa", "Dhido", "Sel Roti"] },
      { label: "Bangladeshi",   dishes: ["Hilsa Fish Curry", "Kacchi Biryani", "Beef Bhuna", "Panta Bhat", "Shorshe Ilish"] },
      { label: "Afghan",        dishes: ["Kabuli Pulao", "Mantu", "Bolani", "Kebabs", "Ashak", "Shorba"] },
    ],
  },
  {
    label: "Latin American",
    cuisines: [
      { label: "Mexican",     dishes: ["Tacos", "Birria", "Enchiladas", "Mole", "Tamales", "Pozole", "Chiles Rellenos"] },
      { label: "Peruvian",    dishes: ["Ceviche", "Lomo Saltado", "Pollo a la Brasa", "Aji de Gallina", "Anticuchos", "Cau Cau"] },
      { label: "Argentine",   dishes: ["Asado", "Empanadas", "Milanesa", "Choripán", "Provoleta", "Locro"] },
      { label: "Brazilian",   dishes: ["Churrasco", "Feijoada", "Pão de Queijo", "Coxinha", "Moqueca", "Açaí Bowl"] },
      { label: "Cuban",       dishes: ["Ropa Vieja", "Lechon Asado", "Cuban Sandwich", "Picadillo", "Tostones", "Arroz con Pollo"] },
      { label: "Colombian",   dishes: ["Bandeja Paisa", "Arepas", "Sancocho", "Changua", "Empanadas", "Fritanga"] },
      { label: "Salvadoran",  dishes: ["Pupusas", "Yuca Frita", "Sopa de Pata", "Pan con Pollo", "Tamales"] },
      { label: "Venezuelan",  dishes: ["Arepas", "Pabellón Criollo", "Cachapas", "Tequeños", "Hallacas"] },
      { label: "Guatemalan",  dishes: ["Pepián", "Kak'ik", "Jocon", "Chiles Rellenos", "Pupusas"] },
      { label: "Puerto Rican", dishes: ["Mofongo", "Pernil", "Arroz con Gandules", "Tostones", "Pasteles", "Alcapurrias"] },
      { label: "Dominican",   dishes: ["La Bandera", "Sancocho", "Mangú", "Chicharrones", "Tostones", "Pasteles en Hoja"] },
    ],
  },
  {
    label: "Caribbean",
    cuisines: [
      { label: "Jamaican",     dishes: ["Jerk Chicken", "Curry Goat", "Oxtail", "Ackee & Saltfish", "Patties", "Escovitch Fish"] },
      { label: "Haitian",      dishes: ["Griot", "Diri ak Djon Djon", "Soup Joumou", "Tassot", "Legim", "Pikliz"] },
      { label: "Trinidadian",  dishes: ["Doubles", "Roti", "Pelau", "Bake & Shark", "Callaloo", "Crab & Dumpling"] },
      { label: "Bahamian",     dishes: ["Conch Fritters", "Cracked Conch", "Peas & Rice", "Fish Fry", "Johnny Cake"] },
    ],
  },
  {
    label: "European (West)",
    cuisines: [
      { label: "Italian",       dishes: ["Pizza", "Pasta Carbonara", "Cacio e Pepe", "Osso Buco", "Risotto", "Bistecca Fiorentina"], icon: "Pizza" },
      { label: "French",        dishes: ["Steak Frites", "Bouillabaisse", "Coq au Vin", "Croque Monsieur", "Crêpes", "Escargot"], icon: "Croissant" },
      { label: "Spanish",       dishes: ["Paella", "Tapas", "Jamón Ibérico", "Gambas al Ajillo", "Gazpacho", "Patatas Bravas"] },
      { label: "Portuguese",    dishes: ["Bacalhau", "Pastéis de Nata", "Francesinha", "Caldo Verde", "Piri Piri Chicken", "Arroz de Marisco"] },
      { label: "German",        dishes: ["Schnitzel", "Bratwurst", "Spaetzle", "Pretzels", "Sauerbraten", "Currywurst"] },
      { label: "British",       dishes: ["Fish & Chips", "Full English Breakfast", "Shepherd's Pie", "Sunday Roast", "Bangers & Mash", "Scotch Egg"] },
      { label: "Irish",         dishes: ["Irish Stew", "Colcannon", "Boxty", "Coddle", "Soda Bread", "Dublin Coddle"] },
      { label: "Belgian",       dishes: ["Moules Frites", "Waffles", "Carbonnade Flamande", "Stoemp", "Belgian Fries", "Waterzooi"] },
      { label: "Dutch",         dishes: ["Stroopwafel", "Erwtensoep", "Bitterballen", "Stamppot", "Herring", "Poffertjes"] },
      { label: "Scandinavian",  dishes: ["Smörgåsbord", "Gravlax", "Swedish Meatballs", "Lefse", "Pickled Herring", "Smorrebrod"] },
    ],
  },
  {
    label: "European (East)",
    cuisines: [
      { label: "Polish",    dishes: ["Pierogi", "Bigos", "Żurek", "Kielbasa", "Barszcz", "Gołąbki"] },
      { label: "Hungarian", dishes: ["Goulash", "Langos", "Chicken Paprikash", "Pörkölt", "Lecsó", "Kürtőskalács"] },
      { label: "Russian",   dishes: ["Borscht", "Pelmeni", "Beef Stroganoff", "Blini", "Solyanka", "Shchi"] },
      { label: "Ukrainian", dishes: ["Varenyky", "Borscht", "Chicken Kyiv", "Holubtsi", "Salo", "Banush"] },
      { label: "Czech",     dishes: ["Svíčková", "Knedlíky", "Goulash", "Smažený Sýr", "Trdelník", "Svíčková na Smetaně"] },
      { label: "Georgian",  dishes: ["Khinkali", "Khachapuri", "Shkmeruli", "Churchkhela", "Lobiani", "Pkhali"] },
    ],
  },
  {
    label: "Mediterranean & Middle East",
    cuisines: [
      { label: "Greek",    dishes: ["Moussaka", "Souvlaki", "Spanakopita", "Gyros", "Pastitsio", "Baklava", "Taramasalata"] },
      { label: "Turkish",  dishes: ["Kebabs", "Lahmacun", "Meze", "Börek", "Pide", "Iskender Kebab", "Baklava"] },
      { label: "Lebanese", dishes: ["Hummus", "Shawarma", "Kibbeh", "Fattoush", "Mujadara", "Tabbouleh", "Kafta"] },
      { label: "Israeli",  dishes: ["Falafel", "Shakshuka", "Sabich", "Hummus", "Jachnun", "Kubbeh", "Sabich"] },
      { label: "Persian",  dishes: ["Ghormeh Sabzi", "Chelo Kebab", "Ash Reshteh", "Fesenjan", "Tahdig", "Joojeh Kabab"] },
      { label: "Egyptian", dishes: ["Koshary", "Ful Medames", "Molokhia", "Hawawshi", "Om Ali", "Fattah"] },
      { label: "Syrian",   dishes: ["Kibbeh", "Meze", "Fattet Hummus", "Muhammara", "Ma'amoul", "Shish Barak"] },
      { label: "Moroccan", dishes: ["Tagine", "Couscous", "Pastilla", "Harira", "Mechoui", "Bisteeya"] },
      { label: "Armenian", dishes: ["Khorovats", "Dolma", "Lahmacun", "Manti", "Ghapama", "Basturma"] },
    ],
  },
  {
    label: "African",
    cuisines: [
      { label: "Ethiopian",   dishes: ["Injera", "Doro Wat", "Kitfo", "Tibs", "Shiro", "Misir Wat", "Gomen"], icon: "CookingPot" },
      { label: "Eritrean",    dishes: ["Injera", "Zigni", "Tsebhi Derho", "Ful", "Shiro", "Hilbet"] },
      { label: "Nigerian",    dishes: ["Jollof Rice", "Egusi Soup", "Suya", "Puff Puff", "Pepper Soup", "Fufu & Soup"] },
      { label: "Ghanaian",    dishes: ["Jollof Rice", "Fufu & Light Soup", "Kelewele", "Kontomire Stew", "Waakye", "Red Red"] },
      { label: "South African", dishes: ["Braai", "Bobotie", "Biltong", "Bunny Chow", "Boerewors", "Potjiekos"] },
      { label: "Senegalese",  dishes: ["Thieboudienne", "Yassa Poulet", "Mafé", "Thiébou Yapp", "Caakiri", "Domoda"] },
      { label: "Somali",      dishes: ["Bariis Iskukaris", "Sambusa", "Cambuulo", "Hilib Shiid", "Xalwo", "Malawah"] },
      { label: "Kenyan",      dishes: ["Ugali & Sukuma Wiki", "Nyama Choma", "Githeri", "Mandazi", "Chapati", "Mutura"] },
    ],
  },
  {
    label: "North American",
    cuisines: [
      { label: "Southern / Soul", dishes: ["Fried Chicken", "Collard Greens", "Mac & Cheese", "Biscuits & Gravy", "Catfish", "Cornbread"], icon: "Drumstick" },
      { label: "BBQ",             dishes: ["Brisket", "Pulled Pork", "Baby Back Ribs", "Burnt Ends", "Smoked Sausage", "Carolina Pulled Pork"], icon: "Flame" },
      { label: "Cajun / Creole",  dishes: ["Gumbo", "Jambalaya", "Crawfish Étouffée", "Po'boys", "Beignets", "Muffuletta"], icon: "Flame" },
      { label: "Tex-Mex",         dishes: ["Fajitas", "Queso", "Breakfast Tacos", "Nachos", "Chili", "Enchiladas"] },
      { label: "Hawaiian",        dishes: ["Poke Bowl", "Plate Lunch", "Kalua Pig", "Lomi Lomi Salmon", "Spam Musubi", "Malasadas"] },
      { label: "New American",    dishes: ["Farm-to-Table Tasting", "Craft Burgers", "Lobster Rolls", "Seasonal Small Plates", "Charcuterie"] },
      { label: "Diner / Comfort", dishes: ["Pancakes", "Club Sandwich", "Meatloaf", "Chicken Pot Pie", "Patty Melt", "Milkshakes"] },
    ],
  },
  {
    label: "Specialty",
    cuisines: [
      { label: "Pizza",               dishes: ["Neapolitan", "NY Slice", "Detroit Style", "Sicilian", "Chicago Deep Dish", "Margherita"], icon: "Pizza" },
      { label: "Burgers",             dishes: ["Smash Burger", "Classic Pub Burger", "Wagyu Burger", "Double Double", "Mushroom Swiss", "Turkey Burger"], icon: "Beef" },
      { label: "Sandwiches & Delis",  dishes: ["Pastrami on Rye", "Italian Sub", "Cubano", "French Dip", "Lobster Roll", "Muffuletta"], icon: "Sandwich" },
      { label: "Seafood",             dishes: ["Oysters", "Lobster", "Dungeness Crab", "Fish Tacos", "Ceviche", "Clam Chowder"], icon: "Fish" },
      { label: "Steakhouse",          dishes: ["Ribeye", "Filet Mignon", "Wagyu", "Dry-Aged NY Strip", "Tomahawk", "Surf & Turf"], icon: "Beef" },
      { label: "Breakfast & Brunch",  dishes: ["Eggs Benedict", "Chilaquiles", "Avocado Toast", "French Toast", "Shakshuka", "Pancakes"], icon: "Coffee" },
      { label: "Vegan / Plant-based", dishes: ["Jackfruit Tacos", "Beyond Burger", "Grain Bowls", "Vegan Ramen", "Cauliflower Wings", "Vegan Sushi"], icon: "Leaf" },
      { label: "Food Halls & Markets", dishes: ["Food hall", "Food market", "Food court", "Street food market", "Artisan food hall"], icon: "Warehouse" },
    ],
  },
];

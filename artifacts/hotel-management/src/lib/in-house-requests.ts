// =============================================================================
// In-House Dining & Service Requests Store (Synchronized between Guest Portal & Waiters)
// =============================================================================

export interface InHouseRequestItem {
  name: string;
  quantity: number;
  category?: string;
  price?: number;
  station?: "grill" | "hot" | "cold" | "pastry";
}

export interface InHouseServiceRequest {
  id: string;
  requestNumber: string;
  roomNumber: string;
  guestName: string;
  phone?: string;
  assignedWaiterId: string;
  assignedWaiterName: string;
  items: InHouseRequestItem[];
  specialNotes?: string;
  totalAmount?: number;
  status: "pending" | "dispatched" | "served";
  stage?: "pending_assignment" | "waiter_assigned" | "dispatched" | "cooking" | "ready" | "served";
  createdAt: string;
}

export interface WaiterStaff {
  id: string;
  name: string;
  role: string;
  status: "Available" | "Busy";
  vacant: boolean;
}

export const AVAILABLE_WAITERS: WaiterStaff[] = [
  { id: "waiter-1", name: "Dawit M.", role: "Floor Server 1", status: "Available", vacant: true },
  { id: "waiter-2", name: "Helen T.", role: "Floor Server 2", status: "Available", vacant: true },
  { id: "waiter-3", name: "Sarah K.", role: "Floor Server 3", status: "Available", vacant: true },
  { id: "waiter-4", name: "Robel A.", role: "Floor Server 4", status: "Available", vacant: true },
];

export interface RoomServiceMenuItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  desc: string;
  prepTime: string;
  badge?: string;
  station: "grill" | "hot" | "cold" | "pastry";
}

export const ROOM_SERVICE_CATEGORIES = [
  { id: "traditional", name: "1. Ethiopian Traditional Food" },
  { id: "meat", name: "2. Meat Dishes" },
  { id: "veg_fasting", name: "3. Vegetarian and Fasting Food" },
  { id: "international", name: "4. International Food" },
  { id: "breakfast", name: "5. Breakfast" },
  { id: "hot_drinks", name: "6. Hot Drinks" },
  { id: "juices_smoothies", name: "7. Fresh Juices and Smoothies" },
  { id: "cold_drinks", name: "8. Cold Drinks and Soft Drinks" },
  { id: "desserts", name: "9. Desserts" },
  { id: "snacks_appetizers", name: "10. Snacks and Appetizers" },
];

export const FULL_ROOM_SERVICE_MENU: RoomServiceMenuItem[] = [
  // 1. Ethiopian Traditional Food
  { id: "et-1", name: "Doro Wot (ዶሮ ወጥ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 2400, desc: "Simmered tender chicken drumstick & boiled organic egg in rich berbere sauce with fresh injera.", prepTime: "25-35 mins", badge: "Chef's Signature", station: "hot" },
  { id: "et-2", name: "Siga Wot (ስጋ ወጥ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 2100, desc: "Slow-braised prime beef cubes in spiced red pepper sauce with warm fermented injera.", prepTime: "25-30 mins", station: "hot" },
  { id: "et-3", name: "Tibs (ጥብስ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 1950, desc: "Sautéed beef tenderloin with rosemary, onions, garlic, and fresh green jalapeños.", prepTime: "15-20 mins", badge: "Popular", station: "grill" },
  { id: "et-4", name: "Kitfo (ክትፎ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 2300, desc: "Finely minced lean beef seasoned with niter kibbeh & mitmita, served leb-leb with ayeb cheese.", prepTime: "15-20 mins", badge: "Local Delicacy", station: "hot" },
  { id: "et-5", name: "Shiro Wot (ሽሮ ወጥ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 950, desc: "Velvety spiced ground chickpea stew slow-cooked in traditional clay pot.", prepTime: "15 mins", station: "hot" },
  { id: "et-6", name: "Beyaynetu (በያይነቱ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 1200, desc: "Grand colorful assortment of 8 fasting vegan dishes served atop fresh teff injera.", prepTime: "20 mins", badge: "Vegan Platter", station: "cold" },
  { id: "et-7", name: "Firfir (ፍርፍር)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 900, desc: "Torn soft injera sautéed in aromatic spiced berbere sauce and garlic butter.", prepTime: "15 mins", station: "hot" },
  { id: "et-8", name: "Dulet (ዱለት)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 1600, desc: "Pan-minced lamb tripe, liver, and lean tenderloin with diced red onions and niter kibbeh.", prepTime: "20 mins", station: "hot" },
  { id: "et-9", name: "Gomen Besiga (ጎመን በስጋ)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 1500, desc: "Tender beef chunks stewed with seasoned collard greens, garlic, and ginger.", prepTime: "25 mins", station: "hot" },
  { id: "et-10", name: "Quanta Firfir (ቋንጣ ፍርፍር)", categoryId: "traditional", categoryName: "Ethiopian Traditional Food", price: 1850, desc: "Sun-dried seasoned cured beef jerky pieces simmered into rich spicy injera firfir.", prepTime: "20 mins", station: "hot" },

  // 2. Meat Dishes
  { id: "md-1", name: "Special Beef Tibs", categoryId: "meat", categoryName: "Meat Dishes", price: 2200, desc: "Pan-roasted prime beef tenderloin sizzled with garlic butter, jalapeño, and awaze dip.", prepTime: "20 mins", badge: "Specialty", station: "grill" },
  { id: "md-2", name: "Awaze Tibs", categoryId: "meat", categoryName: "Meat Dishes", price: 2100, desc: "Juicy beef strips cooked in spicy awaze marinade with sweet red onions.", prepTime: "20 mins", station: "grill" },
  { id: "md-3", name: "Shekla Tibs", categoryId: "meat", categoryName: "Meat Dishes", price: 2300, desc: "Charcoal clay-pot served piping hot with rosemary sprigs and fresh injera.", prepTime: "25 mins", badge: "Clay Pot", station: "grill" },
  { id: "md-4", name: "Beef Steak", categoryId: "meat", categoryName: "Meat Dishes", price: 2800, desc: "Grilled 250g sirloin steak with peppercorn gravy, roasted baby vegetables, and mashed potato.", prepTime: "25-30 mins", badge: "Prime Cut", station: "grill" },
  { id: "md-5", name: "Grilled Chicken", categoryId: "meat", categoryName: "Meat Dishes", price: 2100, desc: "Marinated herb chicken breast grilled over flame with steamed garden vegetables.", prepTime: "20 mins", station: "grill" },
  { id: "md-6", name: "Roasted Chicken", categoryId: "meat", categoryName: "Meat Dishes", price: 2250, desc: "Crisp half-chicken oven roasted with rosemary butter and garlic-parsley potato wedges.", prepTime: "30 mins", station: "grill" },
  { id: "md-7", name: "Lamb Chops", categoryId: "meat", categoryName: "Meat Dishes", price: 2900, desc: "Four tender grilled lamb chops glazed with balsamic reduction and mint sauce.", prepTime: "25 mins", badge: "Chef's Cut", station: "grill" },
  { id: "md-8", name: "Beef Goulash", categoryId: "meat", categoryName: "Meat Dishes", price: 2000, desc: "Hearty Hungarian-style beef goulash stew with sweet paprika, bell peppers, and butter rice.", prepTime: "25 mins", station: "hot" },

  // 3. Vegetarian and Fasting Food
  { id: "vf-1", name: "Shiro Wot", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 950, desc: "Authentic slow-simmered chickpea flour stew served with fresh injera.", prepTime: "15 mins", station: "hot" },
  { id: "vf-2", name: "Misir Wot (ምስር ወጥ)", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 950, desc: "Red split lentils slow-cooked with spicy berbere, red onions, and ginger.", prepTime: "20 mins", station: "hot" },
  { id: "vf-3", name: "Kik Alicha (ቅል አልጫ)", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 900, desc: "Mild turmeric yellow split pea stew gently seasoned with garlic and onions.", prepTime: "15 mins", station: "hot" },
  { id: "vf-4", name: "Gomen (ጎመን)", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 850, desc: "Finely chopped steamed Ethiopian collard greens tossed with mild green peppers.", prepTime: "15 mins", station: "hot" },
  { id: "vf-5", name: "Atakilt Wot (አትክልት ወጥ)", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 900, desc: "Medley of sautéed cabbage, carrots, potatoes, and mild herbs.", prepTime: "15 mins", station: "hot" },
  { id: "vf-6", name: "Bozena Shiro", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 1400, desc: "Rich spiced shiro stew blended with minced seasoned meat.", prepTime: "20 mins", station: "hot" },
  { id: "vf-7", name: "Fasting Beyaynetu", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 1200, desc: "Traditional platter of mixed fasting pulses, greens, and salad with soft injera.", prepTime: "15 mins", badge: "Fasting Special", station: "cold" },
  { id: "vf-8", name: "Vegetable Firfir", categoryId: "veg_fasting", categoryName: "Vegetarian and Fasting Food", price: 950, desc: "Shredded injera sautéed in tomato berbere broth with fresh herbs.", prepTime: "15 mins", station: "hot" },

  // 4. International Food
  { id: "int-1", name: "Spaghetti Bolognese", categoryId: "international", categoryName: "International Food", price: 1400, desc: "Classic Italian beef ragu over al dente spaghetti with aged parmesan shavings.", prepTime: "20 mins", station: "hot" },
  { id: "int-2", name: "Pasta Alfredo", categoryId: "international", categoryName: "International Food", price: 1500, desc: "Creamy garlic parmesan sauce over fettuccine with roasted button mushrooms.", prepTime: "20 mins", station: "hot" },
  { id: "int-3", name: "Pizza", categoryId: "international", categoryName: "International Food", price: 1650, desc: "Hand-stretched stone oven pizza with fresh mozzarella, tomato passata, and fresh basil.", prepTime: "20-25 mins", badge: "Oven Baked", station: "hot" },
  { id: "int-4", name: "Beef Burger", categoryId: "international", categoryName: "International Food", price: 1750, desc: "200g grilled beef patty, cheddar, lettuce, caramelized onions, brioche bun, and golden fries.", prepTime: "20 mins", badge: "Classic", station: "grill" },
  { id: "int-5", name: "Chicken Burger", categoryId: "international", categoryName: "International Food", price: 1600, desc: "Crispy buttermilk fried chicken breast, house slaw, spicy mayo, and golden fries.", prepTime: "20 mins", station: "grill" },
  { id: "int-6", name: "Club Sandwich", categoryId: "international", categoryName: "International Food", price: 1450, desc: "Triple-decker toasted sandwich with smoked turkey, egg, tomato, lettuce, and fries.", prepTime: "15 mins", station: "cold" },
  { id: "int-7", name: "Chicken Sandwich", categoryId: "international", categoryName: "International Food", price: 1400, desc: "Grilled chicken fillet on artisan baguette with melted cheese and honey mustard.", prepTime: "15 mins", station: "cold" },
  { id: "int-8", name: "Fried Rice", categoryId: "international", categoryName: "International Food", price: 1200, desc: "Wok-tossed jasmine rice with vegetables, farm eggs, spring onions, and light soy.", prepTime: "15 mins", station: "hot" },
  { id: "int-9", name: "Grilled Fish", categoryId: "international", categoryName: "International Food", price: 2300, desc: "Flame-grilled Lake Tana fish fillet with garlic-lemon butter and seasoned wild rice.", prepTime: "25 mins", station: "grill" },
  { id: "int-10", name: "French Fries", categoryId: "international", categoryName: "International Food", price: 650, desc: "Crispy double-cooked sea-salt potato fries with house dipping sauces.", prepTime: "10 mins", station: "hot" },

  // 5. Breakfast
  { id: "bf-1", name: "Chechebsa (ጨጨብሳ)", categoryId: "breakfast", categoryName: "Breakfast", price: 850, desc: "Torn flatbread shallow fried in niter kibbeh & berbere, drizzled with pure highland honey.", prepTime: "15 mins", badge: "Signature Breakfast", station: "hot" },
  { id: "bf-2", name: "Kinche (ቅንጬ)", categoryId: "breakfast", categoryName: "Breakfast", price: 750, desc: "Warm cracked wheat porridge gently tossed with spiced Ethiopian butter.", prepTime: "15 mins", station: "hot" },
  { id: "bf-3", name: "Firfir", categoryId: "breakfast", categoryName: "Breakfast", price: 900, desc: "Morning breakfast injera firfir in mild spiced stew with warm crusty bread.", prepTime: "15 mins", station: "hot" },
  { id: "bf-4", name: "Enkulal Firfir (scrambled eggs with injera)", categoryId: "breakfast", categoryName: "Breakfast", price: 950, desc: "Scrambled farm eggs with diced red onion, tomato, jalapeño, and warm injera.", prepTime: "15 mins", station: "hot" },
  { id: "bf-5", name: "Scrambled Eggs", categoryId: "breakfast", categoryName: "Breakfast", price: 700, desc: "Creamy butter-scrambled farm eggs served with toasted artisan loaf.", prepTime: "10 mins", station: "hot" },
  { id: "bf-6", name: "Fried Eggs", categoryId: "breakfast", categoryName: "Breakfast", price: 700, desc: "Two sunny-side up or over-easy eggs with grilled breakfast tomato and toast.", prepTime: "10 mins", station: "hot" },
  { id: "bf-7", name: "Omelette", categoryId: "breakfast", categoryName: "Breakfast", price: 850, desc: "Three-egg fluffy omelette with cheese, diced bell pepper, mushroom, and herbs.", prepTime: "12 mins", station: "hot" },
  { id: "bf-8", name: "Ful Medames", categoryId: "breakfast", categoryName: "Breakfast", price: 800, desc: "Simmered fava beans with olive oil, cumin, chopped tomato, onion, and fresh bread.", prepTime: "15 mins", station: "hot" },
  { id: "bf-9", name: "Bread with Honey and Butter", categoryId: "breakfast", categoryName: "Breakfast", price: 650, desc: "Warm fresh-baked baguette slices served with wild forest honey and sweet cream butter.", prepTime: "5 mins", station: "cold" },
  { id: "bf-10", name: "Pancakes", categoryId: "breakfast", categoryName: "Breakfast", price: 850, desc: "Stack of fluffy golden pancakes served with maple syrup and whipped butter.", prepTime: "15 mins", station: "pastry" },

  // 6. Hot Drinks
  { id: "hd-1", name: "Ethiopian Coffee (ቡና)", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 350, desc: "Freshly roasted highland arabica coffee brewed to order in authentic jebena clay pot.", prepTime: "10 mins", badge: "Highland Arabica", station: "hot" },
  { id: "hd-2", name: "Macchiato", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 450, desc: "Rich double espresso with a velvety layer of micro-foamed hot milk.", prepTime: "5 mins", station: "hot" },
  { id: "hd-3", name: "Espresso", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 350, desc: "Concentrated shot of intense, aromatic single-origin espresso.", prepTime: "5 mins", station: "hot" },
  { id: "hd-4", name: "Cappuccino", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 500, desc: "Equal parts espresso, steamed milk, and airy froth dusted with cocoa powder.", prepTime: "5 mins", station: "hot" },
  { id: "hd-5", name: "Latte", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 550, desc: "Smooth espresso blended with generous steamed milk and light foam.", prepTime: "5 mins", station: "hot" },
  { id: "hd-6", name: "Black Tea", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 250, desc: "Premium brewed Ceylon tea served with fresh lemon slice.", prepTime: "5 mins", station: "hot" },
  { id: "hd-7", name: "Spiced Tea", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 300, desc: "Traditional infused tea with cinnamon, cloves, cardamom, and fresh ginger.", prepTime: "8 mins", station: "hot" },
  { id: "hd-8", name: "Hot Chocolate", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 600, desc: "Decadent Dutch cocoa stirred with whole milk and topped with mini marshmallows.", prepTime: "5 mins", station: "hot" },
  { id: "hd-9", name: "Ethiopian Coffee Ceremony", categoryId: "hot_drinks", categoryName: "Hot Drinks", price: 1200, desc: "Full in-suite coffee ceremony service with frankincense aroma, freshly popped popcorn, and 3 rounds of coffee.", prepTime: "25 mins", badge: "Cultural Experience", station: "hot" },

  // 7. Fresh Juices and Smoothies
  { id: "js-1", name: "Spris (ስፕሪስ)", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 550, desc: "Layered natural fresh mango, avocado, and papaya juice with lime wedge.", prepTime: "10 mins", badge: "House Favorite", station: "cold" },
  { id: "js-2", name: "Avocado Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 550, desc: "Thick creamy Hass avocado juice served with fresh lime squeeze.", prepTime: "10 mins", station: "cold" },
  { id: "js-3", name: "Mango Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 550, desc: "Pure blended ripe tropical mango with natural sweet pulp.", prepTime: "10 mins", station: "cold" },
  { id: "js-4", name: "Papaya Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 500, desc: "Smooth chilled fresh papaya juice with hint of lime.", prepTime: "10 mins", station: "cold" },
  { id: "js-5", name: "Pineapple Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 500, desc: "Cold-pressed sweet and tangy fresh pineapple juice.", prepTime: "10 mins", station: "cold" },
  { id: "js-6", name: "Orange Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 600, desc: "100% freshly squeezed sweet Valencia oranges.", prepTime: "10 mins", station: "cold" },
  { id: "js-7", name: "Watermelon Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 500, desc: "Ultra-refreshing cold-pressed crisp watermelon juice.", prepTime: "10 mins", station: "cold" },
  { id: "js-8", name: "Mixed Fruit Juice", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 600, desc: "Tropical blend of seasonal mango, pineapple, passion fruit, and orange.", prepTime: "10 mins", station: "cold" },
  { id: "js-9", name: "Banana Smoothie", categoryId: "juices_smoothies", categoryName: "Fresh Juices and Smoothies", price: 650, desc: "Blended ripe bananas, Greek yogurt, highland honey, and oat milk.", prepTime: "10 mins", station: "cold" },

  // 8. Cold Drinks and Soft Drinks
  { id: "cd-1", name: "Bottled Water", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 250, desc: "Premium 750ml still natural mineral spring water.", prepTime: "5 mins", station: "cold" },
  { id: "cd-2", name: "Sparkling Water", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 350, desc: "Naturally carbonated Ambo sparkling mineral water with lime.", prepTime: "5 mins", station: "cold" },
  { id: "cd-3", name: "Coca-Cola", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 300, desc: "330ml chilled glass bottle served with ice and lemon.", prepTime: "5 mins", station: "cold" },
  { id: "cd-4", name: "Fanta", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 300, desc: "Chilled orange fanta served with ice.", prepTime: "5 mins", station: "cold" },
  { id: "cd-5", name: "Sprite", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 300, desc: "Crisp lemon-lime soda served chilled over ice.", prepTime: "5 mins", station: "cold" },
  { id: "cd-6", name: "Pepsi", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 300, desc: "Chilled 330ml Pepsi bottle.", prepTime: "5 mins", station: "cold" },
  { id: "cd-7", name: "Soda Water", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 300, desc: "Crisp club soda with fresh lemon slice.", prepTime: "5 mins", station: "cold" },
  { id: "cd-8", name: "Malt Drink", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 400, desc: "Rich non-alcoholic malt beverage served ice cold.", prepTime: "5 mins", station: "cold" },
  { id: "cd-9", name: "Energy Drink", categoryId: "cold_drinks", categoryName: "Cold Drinks and Soft Drinks", price: 550, desc: "250ml premium chilled energy drink.", prepTime: "5 mins", station: "cold" },

  // 9. Desserts
  { id: "ds-1", name: "Chocolate Cake", categoryId: "desserts", categoryName: "Desserts", price: 850, desc: "Rich dark Belgian chocolate fudge cake with ganache glaze.", prepTime: "10 mins", station: "pastry" },
  { id: "ds-2", name: "Cheesecake", categoryId: "desserts", categoryName: "Desserts", price: 950, desc: "Classic New York style baked cheesecake with berry coulis.", prepTime: "10 mins", badge: "Chef's Special", station: "pastry" },
  { id: "ds-3", name: "Fruit Salad", categoryId: "desserts", categoryName: "Desserts", price: 650, desc: "Cubed fresh seasonal fruits with passion fruit syrup and fresh mint.", prepTime: "10 mins", station: "cold" },
  { id: "ds-4", name: "Ice Cream", categoryId: "desserts", categoryName: "Desserts", price: 600, desc: "Three scoops of artisan gelato: choice of Bourbon Vanilla, Dark Chocolate, or Strawberry.", prepTime: "5 mins", station: "pastry" },
  { id: "ds-5", name: "Pancakes with Honey", categoryId: "desserts", categoryName: "Desserts", price: 850, desc: "Warm buttermilk pancake stack drizzled with organic acacia honey.", prepTime: "15 mins", station: "pastry" },
  { id: "ds-6", name: "Pudding", categoryId: "desserts", categoryName: "Desserts", price: 700, desc: "Silky caramel flan pudding with spun sugar garnish.", prepTime: "10 mins", station: "pastry" },
  { id: "ds-7", name: "Brownies", categoryId: "desserts", categoryName: "Desserts", price: 750, desc: "Warm walnut fudge brownie served with a scoop of vanilla ice cream.", prepTime: "10 mins", station: "pastry" },
  { id: "ds-8", name: "Fresh Fruit Platter", categoryId: "desserts", categoryName: "Desserts", price: 950, desc: "Artfully carved tropical papaya, sweet pineapple, mango, grapes, and kiwi.", prepTime: "15 mins", station: "cold" },

  // 10. Snacks and Appetizers
  { id: "sa-1", name: "Sambusa (ሳምቡሳ)", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 500, desc: "Crispy triangular pastries (3 pcs) filled with spiced lentils or minced beef, served with awaze dip.", prepTime: "12 mins", badge: "Crispy Favorite", station: "hot" },
  { id: "sa-2", name: "Chicken Wings", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 1100, desc: "Six jumbo wings tossed in your choice of spicy peri-peri or honey BBQ glaze.", prepTime: "15 mins", station: "grill" },
  { id: "sa-3", name: "Spring Rolls", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 750, desc: "Four crispy vegetable spring rolls served with sweet chili dipping sauce.", prepTime: "10 mins", station: "hot" },
  { id: "sa-4", name: "Potato Wedges", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 650, desc: "Seasoned rustic potato wedges oven baked and served with garlic aioli.", prepTime: "12 mins", station: "hot" },
  { id: "sa-5", name: "French Fries", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 650, desc: "Golden thin-cut potato fries lightly salted with tomato ketchup.", prepTime: "10 mins", station: "hot" },
  { id: "sa-6", name: "Garlic Bread", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 550, desc: "Toasted Italian baguette with roasted garlic parsley butter and melted mozzarella.", prepTime: "10 mins", station: "hot" },
  { id: "sa-7", name: "Mixed Salad", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 700, desc: "Crisp garden greens, cherry tomatoes, cucumbers, and house herb vinaigrette.", prepTime: "10 mins", station: "cold" },
  { id: "sa-8", name: "Soup of the Day", categoryId: "snacks_appetizers", categoryName: "Snacks and Appetizers", price: 800, desc: "Warm chef-curated daily soup served with fresh warm dinner rolls and butter.", prepTime: "10 mins", station: "hot" },
];

const STORAGE_KEY = "nexus_inhouse_guest_requests";

const DEFAULT_IN_HOUSE_REQUESTS: InHouseServiceRequest[] = [
  {
    id: "ih-req-204",
    requestNumber: "RS 204",
    roomNumber: "204",
    guestName: "Abebe Bikila",
    phone: "+251 911 234567",
    assignedWaiterId: "waiter-1",
    assignedWaiterName: "Dawit M.",
    items: [
      { name: "Doro Wot (ዶሮ ወጥ)", quantity: 1, category: "Ethiopian Traditional Food", price: 2400, station: "hot" },
      { name: "Siga Wot (ስጋ ወጥ)", quantity: 1, category: "Ethiopian Traditional Food", price: 2100, station: "hot" },
      { name: "Sparkling Water", quantity: 2, category: "Cold Drinks and Soft Drinks", price: 350, station: "cold" },
    ],
    specialNotes: "In-house room service dining. Please serve with extra warm injera.",
    totalAmount: 5200,
    status: "pending",
    stage: "waiter_assigned",
    createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: "ih-req-312",
    requestNumber: "RS 312",
    roomNumber: "312",
    guestName: "Sarah Williams",
    phone: "+251 922 456789",
    assignedWaiterId: "waiter-2",
    assignedWaiterName: "Helen T.",
    items: [
      { name: "Tibs (ጥብስ)", quantity: 1, category: "Ethiopian Traditional Food", price: 1950, station: "grill" },
      { name: "Shiro Wot (ሽሮ ወጥ)", quantity: 1, category: "Ethiopian Traditional Food", price: 950, station: "hot" },
      { name: "Mango Juice", quantity: 1, category: "Fresh Juices and Smoothies", price: 550, station: "cold" },
    ],
    specialNotes: "Mild spice preferred.",
    totalAmount: 3450,
    status: "pending",
    stage: "waiter_assigned",
    createdAt: new Date(Date.now() - 11 * 60000).toISOString(),
  },
  {
    id: "ih-req-108",
    requestNumber: "RS 108",
    roomNumber: "108",
    guestName: "Michael Chen",
    phone: "+251 933 678901",
    assignedWaiterId: "waiter-1",
    assignedWaiterName: "Dawit M.",
    items: [
      { name: "Kitfo (ክትፎ)", quantity: 1, category: "Ethiopian Traditional Food", price: 2300, station: "hot" },
      { name: "Avocado Juice", quantity: 1, category: "Fresh Juices and Smoothies", price: 550, station: "cold" },
    ],
    specialNotes: "Leb-leb kitfo style with ayeb cheese.",
    totalAmount: 2850,
    status: "pending",
    stage: "waiter_assigned",
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: "ih-req-405",
    requestNumber: "RS 405",
    roomNumber: "405",
    guestName: "Elena Rostova",
    phone: "+251 944 890123",
    assignedWaiterId: "",
    assignedWaiterName: "",
    items: [
      { name: "Beyaynetu (በያይነቱ)", quantity: 1, category: "Ethiopian Traditional Food", price: 1200, station: "cold" },
      { name: "Ethiopian Coffee (ቡና)", quantity: 1, category: "Hot Drinks", price: 350, station: "hot" },
    ],
    specialNotes: "Fasting vegan platter. Awaiting floor server assignment by Front Desk.",
    totalAmount: 1550,
    status: "pending",
    stage: "pending_assignment",
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

/**
 * Retrieve current active in-house requests from storage or fallback defaults
 */
export function getInHouseRequests(): InHouseServiceRequest[] {
  if (typeof window === "undefined") return DEFAULT_IN_HOUSE_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_IN_HOUSE_REQUESTS));
      return DEFAULT_IN_HOUSE_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_IN_HOUSE_REQUESTS;
  } catch {
    return DEFAULT_IN_HOUSE_REQUESTS;
  }
}

/**
 * Add or update an in-house service request
 */
export function saveInHouseRequest(req: InHouseServiceRequest): void {
  if (typeof window === "undefined") return;
  try {
    const current = getInHouseRequests();
    const existingIndex = current.findIndex(r => r.id === req.id || r.requestNumber === req.requestNumber);
    let updated: InHouseServiceRequest[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = req;
    } else {
      updated = [req, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to save in-house request:", err);
  }
}

/**
 * Receptionist assigns a waiter to a pending in-house request
 */
export function assignWaiterToInHouseRequest(
  requestId: string,
  waiterId: string,
  waiterName: string
): InHouseServiceRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const current = getInHouseRequests();
    let target: InHouseServiceRequest | null = null;
    const updated = current.map((r) => {
      if (r.id === requestId || r.requestNumber === requestId) {
        target = {
          ...r,
          assignedWaiterId: waiterId,
          assignedWaiterName: waiterName,
          stage: "waiter_assigned" as const,
        };
        return target;
      }
      return r;
    });

    if (target) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));

      // Mock AfroMessage SMS notification to waiter test phone number
      const mockPhone = "0954123456";
      console.log(`[AfroMessage SMS] Message dispatched to ${mockPhone}: "Nexus HMS Alert: New room service order assigned for Room ${(target as InHouseServiceRequest).roomNumber}. Please review and dispatch."`);
    }

    return target;
  } catch (err) {
    console.error("Failed to assign waiter to in-house request:", err);
    return null;
  }
}

/**
 * Mark in-house request as dispatched or served
 */
export function markInHouseRequestServed(roomOrId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getInHouseRequests();
    const cleanTarget = String(roomOrId).trim().toLowerCase();
    const updated = current.map(r => {
      if (
        r.id.toLowerCase() === cleanTarget ||
        r.requestNumber.toLowerCase() === cleanTarget ||
        r.roomNumber.toLowerCase() === cleanTarget
      ) {
        return { ...r, status: "served" as const, stage: "served" as const };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to mark in-house request as served:", err);
  }
}

/**
 * Mark in-house request as dispatched to coordinator or kitchen
 */
export function markInHouseRequestDispatched(roomOrId: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getInHouseRequests();
    const cleanTarget = String(roomOrId).trim().toLowerCase();
    const updated = current.map(r => {
      if (
        r.id.toLowerCase() === cleanTarget ||
        r.requestNumber.toLowerCase() === cleanTarget ||
        r.roomNumber.toLowerCase() === cleanTarget
      ) {
        return { ...r, status: "dispatched" as const, stage: "cooking" as const };
      }
      return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nexus_inhouse_requests_updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to mark in-house request as dispatched:", err);
  }
}


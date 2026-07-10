import bcrypt from "bcryptjs";
import { db, usersTable, categoriesTable, productsTable, productVariantsTable, bannersTable, couponsTable, ordersTable, orderItemsTable, reviewsTable, deliverySlotsTable, deliveryZonesTable } from "@workspace/database";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding Shankeshwar Traders database...");

  // FK-safe, idempotent reset (R21.1, R21.2): TRUNCATE the full set of tables
  // the seed repopulates (plus every table that holds FKs into them) in a
  // single CASCADE statement. RESTART IDENTITY resets serial sequences so a
  // re-run produces a clean, orphan-free dataset. delivery_slots/zones are
  // re-inserted below with onConflictDoNothing, so truncating them here is safe.
  // Tables NOT seeded here (e.g. newsletter_subscribers, store_settings) are
  // intentionally left untouched.
  await db.execute(sql`TRUNCATE TABLE
    stock_notifications,
    product_qa,
    wishlist_items,
    cart_items,
    cart_sessions,
    wallet_transactions,
    loyalty_transactions,
    notifications,
    addresses,
    return_requests,
    referrals,
    reviews,
    order_items,
    orders,
    flash_sales,
    product_variants,
    products,
    banners,
    coupons,
    categories,
    users,
    delivery_slots,
    delivery_zones
    RESTART IDENTITY CASCADE`);

  console.log("🧹 Cleared all existing data (TRUNCATE ... RESTART IDENTITY CASCADE)");

  const adminHash = await bcrypt.hash("admin123", 10);
  const customerHash = await bcrypt.hash("customer123", 10);

  const [admin] = await db.insert(usersTable).values({
    name: "Admin NTC", email: "admin@shankeshwartraders.in", phone: "9876543210", passwordHash: adminHash, role: "admin",
  }).returning();
  console.log("✅ Admin user: admin@shankeshwartraders.in / admin123");

  const customerData = [
    { name: "Rajesh Kumar", email: "rajesh@example.com", phone: "9812345670" },
    { name: "Priya Sharma", email: "priya@example.com", phone: "9823456781" },
    { name: "Amit Gupta", email: "amit@example.com", phone: "9834567892" },
    { name: "Sunita Devi", email: "sunita@example.com", phone: "9845678903" },
    { name: "Vikram Singh", email: "vikram@example.com", phone: "9856789014" },
    { name: "Meena Agarwal", email: "meena@example.com", phone: "9867890125" },
    { name: "Ramesh Patel", email: "ramesh@example.com", phone: "9878901236" },
    { name: "Anita Joshi", email: "anita@example.com", phone: "9889012347" },
    { name: "Suresh Verma", email: "suresh@example.com", phone: "9890123458" },
    { name: "Kavita Yadav", email: "kavita@example.com", phone: "9801234569" },
    { name: "Deepak Mehta", email: "deepak@example.com", phone: "9712345670" },
    { name: "Rekha Nair", email: "rekha@example.com", phone: "9723456781" },
    { name: "Ajay Tiwari", email: "ajay@example.com", phone: "9734567892" },
    { name: "Sanjana Khanna", email: "sanjana@example.com", phone: "9745678903" },
    { name: "Mohan Lal", email: "mohan@example.com", phone: "9756789014" },
    { name: "Geeta Soni", email: "geeta@example.com", phone: "9767890125" },
    { name: "Ravi Chandel", email: "ravi@example.com", phone: "9778901236" },
    { name: "Padma Tripathi", email: "padma@example.com", phone: "9789012347" },
    { name: "Ashok Bajaj", email: "ashok@example.com", phone: "9790123458" },
    { name: "Nisha Choudhary", email: "nisha@example.com", phone: "9701234569" },
    { name: "Kiran Sharma", email: "kiran@example.com", phone: "9612345670" },
    { name: "Lalit Saini", email: "lalit@example.com", phone: "9623456781" },
    { name: "Poonam Gupta", email: "poonam@example.com", phone: "9634567892" },
    { name: "Harsh Sisodia", email: "harsh@example.com", phone: "9645678903" },
    { name: "Dimple Arora", email: "dimple@example.com", phone: "9656789014" },
    { name: "Tarun Yadav", email: "tarun@example.com", phone: "9667890125" },
    { name: "Asha Kumari", email: "asha@example.com", phone: "9678901236" },
    { name: "Vivek Dwivedi", email: "vivek@example.com", phone: "9689012347" },
    { name: "Manju Bhatia", email: "manju@example.com", phone: "9690123458" },
    { name: "Satish Pandey", email: "satish@example.com", phone: "9601234569" },
    { name: "Rupali Mathur", email: "rupali@example.com", phone: "9512345670" },
    { name: "Dinesh Rathore", email: "dinesh@example.com", phone: "9523456781" },
    { name: "Seema Sharma", email: "seema@example.com", phone: "9534567892" },
    { name: "Bhavesh Jain", email: "bhavesh@example.com", phone: "9545678903" },
    { name: "Usha Chauhan", email: "usha@example.com", phone: "9556789014" },
    { name: "Naresh Dixit", email: "naresh@example.com", phone: "9567890125" },
    { name: "Alka Vyas", email: "alka@example.com", phone: "9578901236" },
    { name: "Hemant Saxena", email: "hemant@example.com", phone: "9589012347" },
    { name: "Sudha Khatri", email: "sudha@example.com", phone: "9590123458" },
    { name: "Girish Lamba", email: "girish@example.com", phone: "9501234569" },
    { name: "Varsha Joshi", email: "varsha@example.com", phone: "8812345670" },
    { name: "Pramod Tiwari", email: "pramod@example.com", phone: "8823456781" },
    { name: "Ritu Malhotra", email: "ritu@example.com", phone: "8834567892" },
    { name: "Yogesh Gupta", email: "yogesh@example.com", phone: "8845678903" },
    { name: "Shobha Pandey", email: "shobha@example.com", phone: "8856789014" },
    { name: "Mukesh Bansal", email: "mukesh@example.com", phone: "8867890125" },
    { name: "Jyoti Kapoor", email: "jyoti@example.com", phone: "8878901236" },
    { name: "Rakesh Mishra", email: "rakesh@example.com", phone: "8889012347" },
    { name: "Kamla Goyal", email: "kamla@example.com", phone: "8890123458" },
    { name: "Pankaj Agrawal", email: "pankaj@example.com", phone: "8801234569" },
  ];

  const customers = await db.insert(usersTable).values(
    customerData.map(c => ({ ...c, passwordHash: customerHash, role: "customer" as const }))
  ).returning();
  console.log(`✅ Created ${customers.length} customer accounts (password: customer123)`);

  const cats = await db.insert(categoriesTable).values([
    { name: "Vegetables", slug: "vegetables", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop" },
    { name: "Fruits", slug: "fruits", imageUrl: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop" },
    { name: "Dairy", slug: "dairy", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop" },
    { name: "Grains & Rice", slug: "grains", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop" },
    { name: "Spices", slug: "spices", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&h=200&fit=crop" },
    { name: "Snacks", slug: "snacks", imageUrl: "https://images.unsplash.com/photo-1575644752-87b3aeaeb667?w=200&h=200&fit=crop" },
    { name: "Beverages", slug: "beverages", imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop" },
    { name: "Personal Care", slug: "personal-care", imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop" },
  ]).returning();

  const vegId = cats.find(c => c.slug === "vegetables")!.id;
  const fruitId = cats.find(c => c.slug === "fruits")!.id;
  const dairyId = cats.find(c => c.slug === "dairy")!.id;
  const grainsId = cats.find(c => c.slug === "grains")!.id;
  const spicesId = cats.find(c => c.slug === "spices")!.id;
  const snacksId = cats.find(c => c.slug === "snacks")!.id;
  const beveragesId = cats.find(c => c.slug === "beverages")!.id;
  const pcId = cats.find(c => c.slug === "personal-care")!.id;

  const productDefs = [
    // VEGETABLES (15)
    { name: "Fresh Tomatoes", slug: "fresh-tomatoes", description: "Farm-fresh red tomatoes from Jaipur farms, perfect for curries and salads.", imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: true },
    { name: "Green Spinach (Palak)", slug: "green-spinach", description: "Fresh organic spinach leaves, rich in iron and vitamins. Handpicked daily.", imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: true },
    { name: "Red Onion", slug: "red-onion", description: "Premium quality red onions, essential for Indian cooking.", imageUrl: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: true },
    { name: "Potato (Aloo)", slug: "potato", description: "Fresh desi potatoes, great for aloo sabzi, paratha, and more.", imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: true },
    { name: "Green Capsicum", slug: "green-capsicum", description: "Fresh green bell peppers, crispy and flavourful.", imageUrl: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Cauliflower (Gobhi)", slug: "cauliflower", description: "Fresh white cauliflower, great for gobhi masala.", imageUrl: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Carrot (Gajar)", slug: "carrot", description: "Crunchy fresh carrots, perfect for salads, halwa, and sabzi.", imageUrl: "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Bitter Gourd (Karela)", slug: "bitter-gourd", description: "Fresh bitter gourd, excellent for health-conscious cooking.", imageUrl: "https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Brinjal (Baingan)", slug: "brinjal", description: "Fresh purple brinjal for baingan bharta and curries.", imageUrl: "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Ladyfinger (Bhindi)", slug: "ladyfinger", description: "Fresh tender okra, perfect for bhindi masala.", imageUrl: "https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Peas (Matar)", slug: "peas", description: "Fresh green peas, sweet and crunchy for matar paneer.", imageUrl: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Green Chilli", slug: "green-chilli", description: "Fresh spicy green chillies, essential for Indian cooking.", imageUrl: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Bottle Gourd (Lauki)", slug: "bottle-gourd", description: "Light and healthy bottle gourd for lauki ki sabzi.", imageUrl: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Fenugreek (Methi)", slug: "fenugreek", description: "Fresh methi leaves with a distinctive flavour for parathas.", imageUrl: "https://images.unsplash.com/photo-1592591821892-15a48be4ece7?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },
    { name: "Garlic (Lehsun)", slug: "garlic", description: "Fresh garlic bulbs, essential for Indian cooking.", imageUrl: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?w=400&h=400&fit=crop", categoryId: vegId, isFeatured: false },

    // FRUITS (12)
    { name: "Banana", slug: "banana", description: "Sweet ripe bananas, great for breakfast or a quick snack.", imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: true },
    { name: "Shimla Apple", slug: "shimla-apple", description: "Crisp Shimla apples delivered fresh from Himachal Pradesh.", imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: true },
    { name: "Pomegranate (Anar)", slug: "pomegranate", description: "Juicy red pomegranates from Nasik, rich in antioxidants.", imageUrl: "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: true },
    { name: "Mango (Langda)", slug: "mango-langda", description: "Juicy Langda mangoes from Rajasthan, seasonal delight.", imageUrl: "https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: true },
    { name: "Watermelon", slug: "watermelon", description: "Sweet and refreshing watermelon, perfect for summer.", imageUrl: "https://images.unsplash.com/photo-1563114773-84221bd62daa?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: true },
    { name: "Papaya", slug: "papaya", description: "Fresh ripe papaya, rich in vitamins and great for digestion.", imageUrl: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Guava (Amrood)", slug: "guava", description: "Sweet and tangy guavas, high in vitamin C.", imageUrl: "https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Orange (Santra)", slug: "orange", description: "Juicy Nagpur oranges, a vitamin C powerhouse.", imageUrl: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Grape (Angoor)", slug: "grapes", description: "Seedless green grapes, sweet and refreshing.", imageUrl: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Pineapple (Ananas)", slug: "pineapple", description: "Fresh ripe pineapple, sweet and tangy tropical fruit.", imageUrl: "https://images.unsplash.com/photo-1490885578174-acda8905c2c6?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Kiwi", slug: "kiwi", description: "Imported fresh kiwis, rich in vitamin C and fibre.", imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },
    { name: "Lemon (Nimbu)", slug: "lemon", description: "Fresh juicy lemons for cooking, drinks and pickling.", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop", categoryId: fruitId, isFeatured: false },

    // DAIRY (10)
    { name: "Amul Full Cream Milk", slug: "amul-full-cream-milk", description: "Amul full cream milk, 6% fat. Pasteurised and homogenised.", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: true },
    { name: "Fresh Paneer", slug: "fresh-paneer", description: "Soft fresh cottage cheese made daily from pure cow's milk.", imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: true },
    { name: "Amul Butter", slug: "amul-butter", description: "Classic Amul salted butter, the taste of India.", imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: true },
    { name: "Dahi (Curd)", slug: "dahi-curd", description: "Thick and creamy fresh curd, made from full-fat milk daily.", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },
    { name: "Amul Cheese Slices", slug: "amul-cheese-slices", description: "Processed cheese slices, perfect for sandwiches and burgers.", imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },
    { name: "Pure Cow Ghee", slug: "pure-cow-ghee", description: "Clarified butter made from pure cow's milk, rich and aromatic.", imageUrl: "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: true },
    { name: "Amul Ice Cream Vanilla", slug: "amul-ice-cream-vanilla", description: "Rich and creamy Amul vanilla ice cream.", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },
    { name: "Amul Lassi Mango", slug: "amul-lassi-mango", description: "Refreshing mango lassi from Amul, ready to drink.", imageUrl: "https://images.unsplash.com/photo-1541189236674-a3282d1a7d2a?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },
    { name: "Fresh Cream", slug: "fresh-cream", description: "Rich fresh cooking cream, for gravies and desserts.", imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },
    { name: "Mozzarella Cheese", slug: "mozzarella-cheese", description: "Fresh mozzarella for pizzas, salads and pasta.", imageUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop", categoryId: dairyId, isFeatured: false },

    // GRAINS & RICE (12)
    { name: "Daawat Basmati Rice", slug: "daawat-basmati-rice", description: "Premium aged Daawat basmati rice, long grain and aromatic.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: true },
    { name: "Aashirvaad Whole Wheat Atta", slug: "aashirvaad-atta", description: "Fortified whole wheat flour for soft rotis and parathas.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: true },
    { name: "Chana Dal (Split Chickpeas)", slug: "chana-dal", description: "Premium quality chana dal, high in protein and fibre.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Moong Dal (Yellow)", slug: "moong-dal", description: "Split yellow moong dal, easy to digest and nutritious.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Toor Dal (Arhar)", slug: "toor-dal", description: "Premium toor dal for sambar, dal tadka and more.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Urad Dal (Black Lentil)", slug: "urad-dal", description: "Whole urad dal for makhani dal and idli batter.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Rajma (Red Kidney Beans)", slug: "rajma", description: "Premium rajma for the classic rajma chawal.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Masoor Dal (Red Lentil)", slug: "masoor-dal", description: "Red lentils that cook quickly, great for everyday dal.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Poha (Flattened Rice)", slug: "poha", description: "Light flattened rice for poha breakfast, chivda snacks.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Sooji (Semolina)", slug: "sooji", description: "Fine semolina for halwa, upma and sheera.", imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Kabuli Chana (Chickpeas)", slug: "kabuli-chana", description: "White chickpeas for chole, hummus and salads.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },
    { name: "Brown Rice", slug: "brown-rice", description: "Whole grain brown rice, nutritious and fibre-rich.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop", categoryId: grainsId, isFeatured: false },

    // SPICES (10)
    { name: "Rajasthani Red Chilli Powder", slug: "red-chilli-powder", description: "Pure Rajasthani red chilli powder, bold colour and heat.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: true },
    { name: "Turmeric Powder (Haldi)", slug: "turmeric-powder", description: "Pure organic turmeric powder with high curcumin content.", imageUrl: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Garam Masala", slug: "garam-masala", description: "Aromatic blend of whole spices, freshly ground.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Coriander Powder (Dhania)", slug: "coriander-powder", description: "Fresh ground coriander for flavourful curries.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Cumin Seeds (Jeera)", slug: "cumin-seeds", description: "Aromatic cumin seeds for tadka, chaats and more.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Black Pepper (Kali Mirch)", slug: "black-pepper", description: "Whole black peppercorns for fresh grinding.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Cardamom (Elaichi)", slug: "cardamom", description: "Premium green cardamom pods for sweets and chai.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Mustard Seeds (Rai)", slug: "mustard-seeds", description: "Whole mustard seeds for tempering and pickling.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Asafoetida (Hing)", slug: "asafoetida", description: "Strong pungent hing for authentic Indian flavour.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },
    { name: "Chaat Masala", slug: "chaat-masala", description: "Tangy and spicy chaat masala for snacks and fruit.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", categoryId: spicesId, isFeatured: false },

    // SNACKS (10)
    { name: "Haldiram Aloo Bhujia", slug: "haldiram-aloo-bhujia", description: "Crispy classic aloo bhujia namkeen, a Rajasthani original.", imageUrl: "https://images.unsplash.com/photo-1536410436986-b0b15f15aca1?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: true },
    { name: "Parle-G Biscuit", slug: "parle-g-biscuit", description: "India's favourite glucose biscuit for tea-time.", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Lay's Classic Chips", slug: "lays-chips", description: "Crispy potato chips, lightly salted and irresistible.", imageUrl: "https://images.unsplash.com/photo-1548041934-f08d514b5fb9?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Haldiram Mathri", slug: "haldiram-mathri", description: "Crispy flaky mathri, a Rajasthani tea-time classic.", imageUrl: "https://images.unsplash.com/photo-1536410436986-b0b15f15aca1?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Too Yumm Multigrain Chips", slug: "too-yumm-chips", description: "Baked multigrain chips, healthier snacking option.", imageUrl: "https://images.unsplash.com/photo-1548041934-f08d514b5fb9?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Quaker Oats", slug: "quaker-oats", description: "Healthy whole grain oats, great for breakfast.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Kellogg's Corn Flakes", slug: "cornflakes", description: "Crispy corn flakes for a healthy morning start.", imageUrl: "https://images.unsplash.com/photo-1549007994-cb8bed61b09d?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Kurkure Masala Munch", slug: "kurkure-masala", description: "Spicy tangy Kurkure, the ultimate party snack.", imageUrl: "https://images.unsplash.com/photo-1548041934-f08d514b5fb9?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Britannia Good Day Biscuit", slug: "good-day-biscuit", description: "Butter cookies with cashew, rich and melt-in-mouth.", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },
    { name: "Haldiram Mixture", slug: "haldiram-mixture", description: "Classic Haldiram mixture with peanuts, sev and flakes.", imageUrl: "https://images.unsplash.com/photo-1536410436986-b0b15f15aca1?w=400&h=400&fit=crop", categoryId: snacksId, isFeatured: false },

    // BEVERAGES (10)
    { name: "Mango Frooti", slug: "mango-frooti", description: "Refreshing mango fruit drink, loved by all ages.", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: true },
    { name: "Coca-Cola 2L", slug: "coca-cola-2l", description: "Chilled Coca-Cola, perfect for family get-togethers.", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Lipton Green Tea", slug: "lipton-green-tea", description: "Refreshing Lipton green tea bags for daily wellness.", imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Nescafé Classic Coffee", slug: "nescafe-classic", description: "Rich and aromatic Nescafé classic instant coffee.", imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Bournvita (Health Drink)", slug: "bournvita", description: "Cadbury Bournvita for strong bones and energy.", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Real Juice Mixed Fruit", slug: "real-mixed-fruit", description: "Real mixed fruit juice with no added preservatives.", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Sprite 1.5L", slug: "sprite-1l", description: "Chilled lemon-lime Sprite, refreshing fizzy drink.", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Red Bull Energy Drink", slug: "red-bull", description: "Red Bull energy drink to energize your day.", imageUrl: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Tropicana Orange Juice", slug: "tropicana-orange", description: "100% pure squeezed orange juice by Tropicana.", imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },
    { name: "Amul Buttermilk (Chaas)", slug: "amul-chaas", description: "Refreshing Amul buttermilk with jeera flavour.", imageUrl: "https://images.unsplash.com/photo-1541189236674-a3282d1a7d2a?w=400&h=400&fit=crop", categoryId: beveragesId, isFeatured: false },

    // PERSONAL CARE (10)
    { name: "Dove Beauty Soap", slug: "dove-beauty-soap", description: "Moisturising Dove beauty bar with 1/4 moisturising cream.", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Colgate MaxFresh Toothpaste", slug: "colgate-maxfresh", description: "Colgate MaxFresh with cooling crystals for fresh breath.", imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Pantene Shampoo", slug: "pantene-shampoo", description: "Pantene Pro-V smooth and silky shampoo for damaged hair.", imageUrl: "https://images.unsplash.com/photo-1585352832219-34ccb0d44e52?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Dettol Hand Sanitizer", slug: "dettol-hand-sanitizer", description: "Dettol instant hand sanitizer, kills 99.9% germs.", imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Parachute Coconut Oil", slug: "parachute-coconut-oil", description: "100% pure coconut oil for hair and skin care.", imageUrl: "https://images.unsplash.com/photo-1612197527762-8cfb4b261bfe?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Nivea Face Wash", slug: "nivea-face-wash", description: "Nivea refreshing face wash for normal to oily skin.", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Vaseline Body Lotion", slug: "vaseline-body-lotion", description: "Intensive moisture Vaseline body lotion for dry skin.", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Oral-B Toothbrush", slug: "oral-b-toothbrush", description: "Oral-B deep clean toothbrush with medium bristles.", imageUrl: "https://images.unsplash.com/photo-1559304822-9eb2813a9f4a?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Himalaya Neem Face Pack", slug: "himalaya-neem-face-pack", description: "Natural neem face pack for acne-free glowing skin.", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
    { name: "Dabur Honey", slug: "dabur-honey", description: "Pure natural honey by Dabur, 100% natural goodness.", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop", categoryId: pcId, isFeatured: false },
  ];

  const products = await db.insert(productsTable).values(productDefs).returning();
  console.log(`✅ Created ${products.length} products`);

  type V = { unit: string; unitValue: string; price: number; mrp: number; stock: number };
  type VI = { productId: number; unit: string; unitValue: string; price: string; mrp: string; stock: number };
  const variantData: VI[] = [];
  const addV = (id: number, vs: V[]) => vs.forEach(v => variantData.push({ productId: id, unit: v.unit, unitValue: v.unitValue, price: v.price.toString(), mrp: v.mrp.toString(), stock: v.stock }));

  const pBySlug = new Map(products.map(p => [p.slug, p]));
  const pid = (slug: string) => pBySlug.get(slug)!.id;

  // Vegetables
  addV(pid("fresh-tomatoes"),  [{ unit: "g", unitValue: "500", price: 22, mrp: 28, stock: 200 }, { unit: "kg", unitValue: "1", price: 40, mrp: 50, stock: 150 }]);
  addV(pid("green-spinach"),   [{ unit: "bunch", unitValue: "1", price: 15, mrp: 20, stock: 100 }]);
  addV(pid("red-onion"),       [{ unit: "kg", unitValue: "1", price: 35, mrp: 45, stock: 300 }, { unit: "kg", unitValue: "3", price: 99, mrp: 130, stock: 100 }]);
  addV(pid("potato"),          [{ unit: "kg", unitValue: "1", price: 28, mrp: 35, stock: 400 }, { unit: "kg", unitValue: "5", price: 130, mrp: 165, stock: 150 }]);
  addV(pid("green-capsicum"),  [{ unit: "g", unitValue: "250", price: 30, mrp: 38, stock: 80 }, { unit: "kg", unitValue: "1", price: 110, mrp: 140, stock: 60 }]);
  addV(pid("cauliflower"),     [{ unit: "piece", unitValue: "1", price: 40, mrp: 55, stock: 120 }]);
  addV(pid("carrot"),          [{ unit: "kg", unitValue: "1", price: 32, mrp: 40, stock: 200 }, { unit: "g", unitValue: "500", price: 18, mrp: 22, stock: 150 }]);
  addV(pid("bitter-gourd"),    [{ unit: "g", unitValue: "500", price: 28, mrp: 35, stock: 80 }]);
  addV(pid("brinjal"),         [{ unit: "kg", unitValue: "1", price: 30, mrp: 40, stock: 100 }]);
  addV(pid("ladyfinger"),      [{ unit: "g", unitValue: "500", price: 25, mrp: 32, stock: 120 }]);
  addV(pid("peas"),            [{ unit: "g", unitValue: "500", price: 35, mrp: 45, stock: 100 }, { unit: "kg", unitValue: "1", price: 65, mrp: 85, stock: 80 }]);
  addV(pid("green-chilli"),    [{ unit: "g", unitValue: "100", price: 12, mrp: 15, stock: 150 }, { unit: "g", unitValue: "250", price: 28, mrp: 35, stock: 100 }]);
  addV(pid("bottle-gourd"),    [{ unit: "piece", unitValue: "1", price: 22, mrp: 30, stock: 90 }]);
  addV(pid("fenugreek"),       [{ unit: "bunch", unitValue: "1", price: 10, mrp: 15, stock: 80 }]);
  addV(pid("garlic"),          [{ unit: "g", unitValue: "100", price: 18, mrp: 25, stock: 200 }, { unit: "g", unitValue: "250", price: 42, mrp: 58, stock: 120 }]);

  // Fruits
  addV(pid("banana"),          [{ unit: "dozen", unitValue: "1", price: 48, mrp: 60, stock: 200 }, { unit: "pc", unitValue: "6", price: 28, mrp: 35, stock: 150 }]);
  addV(pid("shimla-apple"),    [{ unit: "kg", unitValue: "1", price: 160, mrp: 200, stock: 100 }, { unit: "g", unitValue: "500", price: 85, mrp: 110, stock: 80 }]);
  addV(pid("pomegranate"),     [{ unit: "kg", unitValue: "1", price: 140, mrp: 180, stock: 80 }]);
  addV(pid("mango-langda"),    [{ unit: "kg", unitValue: "1", price: 90, mrp: 120, stock: 0 }]);
  addV(pid("watermelon"),      [{ unit: "kg", unitValue: "1", price: 18, mrp: 25, stock: 60 }, { unit: "piece", unitValue: "1", price: 120, mrp: 160, stock: 30 }]);
  addV(pid("papaya"),          [{ unit: "kg", unitValue: "1", price: 35, mrp: 50, stock: 60 }]);
  addV(pid("guava"),           [{ unit: "kg", unitValue: "1", price: 55, mrp: 70, stock: 80 }]);
  addV(pid("orange"),          [{ unit: "kg", unitValue: "1", price: 80, mrp: 100, stock: 100 }]);
  addV(pid("grapes"),          [{ unit: "g", unitValue: "500", price: 65, mrp: 80, stock: 70 }]);
  addV(pid("pineapple"),       [{ unit: "piece", unitValue: "1", price: 55, mrp: 70, stock: 50 }]);
  addV(pid("kiwi"),            [{ unit: "piece", unitValue: "6", price: 120, mrp: 150, stock: 40 }]);
  addV(pid("lemon"),           [{ unit: "piece", unitValue: "6", price: 18, mrp: 24, stock: 200 }]);

  // Dairy
  addV(pid("amul-full-cream-milk"), [{ unit: "L", unitValue: "0.5", price: 32, mrp: 35, stock: 300 }, { unit: "L", unitValue: "1", price: 62, mrp: 68, stock: 200 }]);
  addV(pid("fresh-paneer"),         [{ unit: "g", unitValue: "200", price: 80, mrp: 95, stock: 100 }, { unit: "g", unitValue: "500", price: 185, mrp: 220, stock: 60 }]);
  addV(pid("amul-butter"),          [{ unit: "g", unitValue: "100", price: 55, mrp: 62, stock: 150 }, { unit: "g", unitValue: "500", price: 265, mrp: 295, stock: 80 }]);
  addV(pid("dahi-curd"),            [{ unit: "g", unitValue: "400", price: 42, mrp: 50, stock: 120 }, { unit: "g", unitValue: "1000", price: 95, mrp: 110, stock: 80 }]);
  addV(pid("amul-cheese-slices"),   [{ unit: "g", unitValue: "200", price: 110, mrp: 130, stock: 80 }]);
  addV(pid("pure-cow-ghee"),        [{ unit: "g", unitValue: "500", price: 280, mrp: 350, stock: 80 }, { unit: "kg", unitValue: "1", price: 540, mrp: 680, stock: 50 }]);
  addV(pid("amul-ice-cream-vanilla"), [{ unit: "ml", unitValue: "500", price: 90, mrp: 110, stock: 60 }]);
  addV(pid("amul-lassi-mango"),     [{ unit: "ml", unitValue: "200", price: 20, mrp: 25, stock: 120 }]);
  addV(pid("fresh-cream"),          [{ unit: "ml", unitValue: "200", price: 45, mrp: 55, stock: 80 }]);
  addV(pid("mozzarella-cheese"),    [{ unit: "g", unitValue: "200", price: 120, mrp: 145, stock: 50 }]);

  // Grains
  addV(pid("daawat-basmati-rice"), [{ unit: "kg", unitValue: "1", price: 95, mrp: 120, stock: 200 }, { unit: "kg", unitValue: "5", price: 445, mrp: 565, stock: 80 }]);
  addV(pid("aashirvaad-atta"),     [{ unit: "kg", unitValue: "5", price: 225, mrp: 260, stock: 150 }, { unit: "kg", unitValue: "10", price: 430, mrp: 500, stock: 80 }]);
  addV(pid("chana-dal"),           [{ unit: "g", unitValue: "500", price: 65, mrp: 80, stock: 150 }, { unit: "kg", unitValue: "1", price: 125, mrp: 155, stock: 100 }]);
  addV(pid("moong-dal"),           [{ unit: "g", unitValue: "500", price: 70, mrp: 88, stock: 120 }]);
  addV(pid("toor-dal"),            [{ unit: "g", unitValue: "500", price: 80, mrp: 100, stock: 100 }]);
  addV(pid("urad-dal"),            [{ unit: "g", unitValue: "500", price: 75, mrp: 95, stock: 100 }]);
  addV(pid("rajma"),               [{ unit: "g", unitValue: "500", price: 72, mrp: 90, stock: 100 }]);
  addV(pid("masoor-dal"),          [{ unit: "g", unitValue: "500", price: 60, mrp: 75, stock: 120 }]);
  addV(pid("poha"),                [{ unit: "g", unitValue: "500", price: 35, mrp: 44, stock: 150 }]);
  addV(pid("sooji"),               [{ unit: "g", unitValue: "500", price: 28, mrp: 35, stock: 150 }]);
  addV(pid("kabuli-chana"),        [{ unit: "g", unitValue: "500", price: 68, mrp: 85, stock: 100 }]);
  addV(pid("brown-rice"),          [{ unit: "kg", unitValue: "1", price: 85, mrp: 110, stock: 80 }]);

  // Spices
  addV(pid("red-chilli-powder"),   [{ unit: "g", unitValue: "100", price: 25, mrp: 32, stock: 200 }, { unit: "g", unitValue: "500", price: 110, mrp: 145, stock: 120 }]);
  addV(pid("turmeric-powder"),     [{ unit: "g", unitValue: "100", price: 20, mrp: 28, stock: 200 }, { unit: "g", unitValue: "500", price: 88, mrp: 115, stock: 100 }]);
  addV(pid("garam-masala"),        [{ unit: "g", unitValue: "100", price: 45, mrp: 58, stock: 150 }]);
  addV(pid("coriander-powder"),    [{ unit: "g", unitValue: "100", price: 22, mrp: 28, stock: 150 }]);
  addV(pid("cumin-seeds"),         [{ unit: "g", unitValue: "100", price: 35, mrp: 45, stock: 200 }]);
  addV(pid("black-pepper"),        [{ unit: "g", unitValue: "50", price: 38, mrp: 50, stock: 150 }]);
  addV(pid("cardamom"),            [{ unit: "g", unitValue: "50", price: 55, mrp: 70, stock: 100 }]);
  addV(pid("mustard-seeds"),       [{ unit: "g", unitValue: "100", price: 18, mrp: 25, stock: 200 }]);
  addV(pid("asafoetida"),          [{ unit: "g", unitValue: "50", price: 32, mrp: 42, stock: 150 }]);
  addV(pid("chaat-masala"),        [{ unit: "g", unitValue: "100", price: 28, mrp: 38, stock: 150 }]);

  // Snacks
  addV(pid("haldiram-aloo-bhujia"), [{ unit: "g", unitValue: "200", price: 45, mrp: 50, stock: 200 }, { unit: "g", unitValue: "400", price: 85, mrp: 95, stock: 150 }]);
  addV(pid("parle-g-biscuit"),      [{ unit: "g", unitValue: "799", price: 30, mrp: 35, stock: 300 }]);
  addV(pid("lays-chips"),           [{ unit: "g", unitValue: "26", price: 20, mrp: 20, stock: 250 }, { unit: "g", unitValue: "70", price: 50, mrp: 50, stock: 200 }]);
  addV(pid("haldiram-mathri"),      [{ unit: "g", unitValue: "200", price: 65, mrp: 75, stock: 150 }]);
  addV(pid("too-yumm-chips"),       [{ unit: "g", unitValue: "24", price: 20, mrp: 20, stock: 200 }]);
  addV(pid("quaker-oats"),          [{ unit: "g", unitValue: "500", price: 145, mrp: 175, stock: 100 }]);
  addV(pid("cornflakes"),           [{ unit: "g", unitValue: "250", price: 75, mrp: 90, stock: 120 }, { unit: "g", unitValue: "500", price: 140, mrp: 168, stock: 80 }]);
  addV(pid("kurkure-masala"),       [{ unit: "g", unitValue: "80", price: 30, mrp: 30, stock: 200 }]);
  addV(pid("good-day-biscuit"),     [{ unit: "g", unitValue: "216", price: 60, mrp: 70, stock: 150 }]);
  addV(pid("haldiram-mixture"),     [{ unit: "g", unitValue: "200", price: 55, mrp: 65, stock: 150 }]);

  // Beverages
  addV(pid("mango-frooti"),         [{ unit: "ml", unitValue: "200", price: 20, mrp: 20, stock: 300 }, { unit: "ml", unitValue: "1000", price: 88, mrp: 95, stock: 150 }]);
  addV(pid("coca-cola-2l"),         [{ unit: "L", unitValue: "2", price: 100, mrp: 120, stock: 100 }]);
  addV(pid("lipton-green-tea"),     [{ unit: "bags", unitValue: "25", price: 90, mrp: 112, stock: 100 }]);
  addV(pid("nescafe-classic"),      [{ unit: "g", unitValue: "50", price: 130, mrp: 160, stock: 80 }, { unit: "g", unitValue: "200", price: 480, mrp: 580, stock: 50 }]);
  addV(pid("bournvita"),            [{ unit: "g", unitValue: "500", price: 240, mrp: 285, stock: 80 }]);
  addV(pid("real-mixed-fruit"),     [{ unit: "ml", unitValue: "1000", price: 135, mrp: 160, stock: 80 }]);
  addV(pid("sprite-1l"),            [{ unit: "L", unitValue: "1.5", price: 65, mrp: 75, stock: 100 }]);
  addV(pid("red-bull"),             [{ unit: "ml", unitValue: "250", price: 125, mrp: 145, stock: 80 }]);
  addV(pid("tropicana-orange"),     [{ unit: "ml", unitValue: "1000", price: 115, mrp: 140, stock: 80 }]);
  addV(pid("amul-chaas"),           [{ unit: "ml", unitValue: "200", price: 15, mrp: 18, stock: 200 }]);

  // Personal Care
  addV(pid("dove-beauty-soap"),     [{ unit: "g", unitValue: "100", price: 52, mrp: 65, stock: 200 }, { unit: "pack", unitValue: "3x100g", price: 145, mrp: 185, stock: 100 }]);
  addV(pid("colgate-maxfresh"),     [{ unit: "g", unitValue: "150", price: 98, mrp: 118, stock: 200 }]);
  addV(pid("pantene-shampoo"),      [{ unit: "ml", unitValue: "180", price: 195, mrp: 230, stock: 100 }]);
  addV(pid("dettol-hand-sanitizer"),[{ unit: "ml", unitValue: "50", price: 55, mrp: 65, stock: 150 }, { unit: "ml", unitValue: "200", price: 185, mrp: 220, stock: 100 }]);
  addV(pid("parachute-coconut-oil"),[{ unit: "ml", unitValue: "200", price: 78, mrp: 95, stock: 150 }]);
  addV(pid("nivea-face-wash"),      [{ unit: "ml", unitValue: "100", price: 145, mrp: 175, stock: 100 }]);
  addV(pid("vaseline-body-lotion"), [{ unit: "ml", unitValue: "200", price: 148, mrp: 178, stock: 100 }]);
  addV(pid("oral-b-toothbrush"),    [{ unit: "piece", unitValue: "1", price: 65, mrp: 80, stock: 200 }]);
  addV(pid("himalaya-neem-face-pack"),[{ unit: "g", unitValue: "75", price: 60, mrp: 75, stock: 100 }]);
  addV(pid("dabur-honey"),          [{ unit: "g", unitValue: "250", price: 165, mrp: 200, stock: 100 }, { unit: "g", unitValue: "500", price: 310, mrp: 375, stock: 60 }]);

  const variants = await db.insert(productVariantsTable).values(variantData).returning();
  console.log(`✅ Created ${variants.length} product variants`);

  await db.insert(bannersTable).values([
    { title: "Fresh Vegetables Daily – Farm Fresh at Your Doorstep", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&h=400&fit=crop", linkUrl: "/category/vegetables", isActive: true, sortOrder: 1 },
    { title: "Summer Fruits Festival – Up to 25% Off", imageUrl: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1200&h=400&fit=crop", linkUrl: "/category/fruits", isActive: true, sortOrder: 2 },
    { title: "Dairy Essentials – Same Day Delivery", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200&h=400&fit=crop", linkUrl: "/category/dairy", isActive: true, sortOrder: 3 },
    { title: "Stock Up on Spices & Grains – Best Prices", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&h=400&fit=crop", linkUrl: "/category/spices", isActive: false, sortOrder: 4 },
  ]);
  console.log("✅ Created banners");

  await db.insert(couponsTable).values([
    { code: "WELCOME20", discountType: "percentage", discountValue: "20", minOrderValue: "200", maxDiscount: "100", isActive: true },
    { code: "SAVE50", discountType: "flat", discountValue: "50", minOrderValue: "499", isActive: true },
    { code: "FLAT100", discountType: "flat", discountValue: "100", minOrderValue: "799", isActive: true },
    { code: "FRESH15", discountType: "percentage", discountValue: "15", minOrderValue: "300", maxDiscount: "75", isActive: true },
    { code: "NTC30", discountType: "percentage", discountValue: "30", minOrderValue: "600", maxDiscount: "150", isActive: true },
    { code: "DAIRY10", discountType: "flat", discountValue: "10", minOrderValue: "150", isActive: true },
    { code: "BIGBUY", discountType: "flat", discountValue: "200", minOrderValue: "1500", isActive: true },
    { code: "NEWUSER", discountType: "percentage", discountValue: "25", minOrderValue: "250", maxDiscount: "125", isActive: false },
  ]);
  console.log("✅ Created coupons");

  const variantsByProduct = new Map<number, typeof variants>();
  for (const v of variants) {
    if (!variantsByProduct.has(v.productId)) variantsByProduct.set(v.productId, []);
    variantsByProduct.get(v.productId)!.push(v);
  }

  const statuses = ["delivered", "delivered", "delivered", "delivered", "delivered", "processing", "out_for_delivery", "confirmed", "pending", "cancelled"] as const;
  const addresses = [
    "12, Malviya Nagar, Jaipur – 302017",
    "45, Vaishali Nagar, Jaipur – 302021",
    "87, Civil Lines, Jaipur – 302006",
    "3, Tonk Road, Jaipur – 302015",
    "22, Mansarovar, Jaipur – 302020",
    "78, Adarsh Nagar, Jaipur – 302004",
    "5, Bhawani Singh Road, Jaipur – 302005",
    "99, Dhuleshwar Garden, Jaipur – 302001",
    "34, Chitrakoot, Jaipur – 302021",
    "11, Raja Park, Jaipur – 302004",
  ];

  const inStockVariants = variants.filter(v => v.stock > 0);
  let ordersCreated = 0;
  const reviews: { userId: number; productId: number; rating: number; comment: string }[] = [];
  const reviewedPairs = new Set<string>();

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const numOrders = Math.floor(Math.random() * 12) + 3;

    for (let j = 0; j < numOrders; j++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const address = addresses[Math.floor(Math.random() * addresses.length)];
      const paymentMethod = Math.random() > 0.4 ? "cod" : "online";
      const numItems = Math.floor(Math.random() * 5) + 1;

      const selectedVariants: typeof variants = [];
      const usedProductIds = new Set<number>();
      for (let k = 0; k < numItems; k++) {
        const candidate = inStockVariants[Math.floor(Math.random() * inStockVariants.length)];
        if (!usedProductIds.has(candidate.productId)) {
          selectedVariants.push(candidate);
          usedProductIds.add(candidate.productId);
        }
      }

      if (selectedVariants.length === 0) continue;

      let subtotal = 0;
      const orderItems: { productId: number; variantId: number; qty: number; price: number }[] = [];
      for (const v of selectedVariants) {
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = parseFloat(v.price);
        subtotal += price * qty;
        orderItems.push({ productId: v.productId, variantId: v.id, qty, price });
      }
      const deliveryFee = subtotal >= 499 ? 0 : 40;
      const total = subtotal + deliveryFee;

      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const [order] = await db.insert(ordersTable).values({
        userId: customer.id,
        paymentMethod,
        paymentStatus: status === "delivered" ? "paid" : "pending",
        subtotal: subtotal.toString(),
        discount: "0",
        deliveryFee: deliveryFee.toString(),
        total: total.toString(),
        address,
        status,
        createdAt,
      }).returning();

      await db.insert(orderItemsTable).values(orderItems.map(item => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.qty,
        price: item.price.toString(),
        subtotal: (item.price * item.qty).toString(),
      })));

      if (status === "delivered") {
        for (const item of orderItems.slice(0, 2)) {
          const key = `${customer.id}-${item.productId}`;
          if (!reviewedPairs.has(key) && Math.random() > 0.4) {
            reviewedPairs.add(key);
            const rating = Math.floor(Math.random() * 2) + 4;
            const comments: Record<number, string[]> = {
              5: ["Excellent quality, very fresh!", "Superb product, will order again!", "Loved it, great value for money!", "Fresh and tasty, 5 stars!"],
              4: ["Good quality product.", "Nice, delivered on time.", "Good value for the price.", "Satisfied with the quality."],
            };
            reviews.push({ userId: customer.id, productId: item.productId, rating, comment: (comments[rating] ?? comments[4])[Math.floor(Math.random() * 4)] });
          }
        }
      }
      ordersCreated++;
    }
  }

  console.log(`✅ Created ${ordersCreated} orders`);

  if (reviews.length > 0) {
    await db.insert(reviewsTable).values(reviews);
    console.log(`✅ Created ${reviews.length} reviews`);
  }

  // Seed delivery slots (moved out of the old migrate.ts). Idempotent insert.
  await db.insert(deliverySlotsTable).values([
    { label: "Morning", timeRange: "7:00 AM – 11:00 AM", sortOrder: 1 },
    { label: "Afternoon", timeRange: "11:00 AM – 3:00 PM", sortOrder: 2 },
    { label: "Evening", timeRange: "3:00 PM – 7:00 PM", sortOrder: 3 },
    { label: "Night", timeRange: "7:00 PM – 10:00 PM", sortOrder: 4 },
  ]).onConflictDoNothing();
  console.log("✅ Seeded delivery slots");

  // Seed delivery zones (moved out of the old migrate.ts). Idempotent insert.
  await db.insert(deliveryZonesTable).values([
    { name: "Central Jaipur", pincodes: "302001,302002,302003,302004", deliveryFee: "30", minOrderForFree: "399" },
    { name: "North Jaipur", pincodes: "302012,302013,302014,302015,302016", deliveryFee: "40", minOrderForFree: "499" },
    { name: "South Jaipur", pincodes: "302018,302019,302020,302021", deliveryFee: "40", minOrderForFree: "499" },
    { name: "East Jaipur", pincodes: "302006,302007,302008", deliveryFee: "50", minOrderForFree: "599" },
    { name: "West Jaipur", pincodes: "302017,302023,302024", deliveryFee: "50", minOrderForFree: "599" },
    { name: "Outer Jaipur", pincodes: "302028,302029,302030,302031,302033,302034,302036,302038,302039,302040", deliveryFee: "60", minOrderForFree: "699" },
  ]).onConflictDoNothing();
  console.log("✅ Seeded delivery zones");

  console.log("🎉 Database seeded successfully!");
  console.log(`📊 Summary: ${customers.length} customers, ${products.length} products, ${variants.length} variants, ~${ordersCreated} orders, ${reviews.length} reviews`);
}

seed().then(() => process.exit(0)).catch(e => { console.error("Seed failed:", e); process.exit(1); });

import bcrypt from "bcryptjs";
import { db, usersTable, categoriesTable, productsTable, productVariantsTable, bannersTable, couponsTable, ordersTable, orderItemsTable, reviewsTable } from "@workspace/database";
import { eq, sql } from "drizzle-orm";

async function seedUpgrade() {
  console.log("🌱 Running Shankeshwar Traders seed upgrade...");

  // Ensure banners exist
  const bannerCount = await db.select({ c: sql<number>`count(*)::int` }).from(bannersTable);
  if (bannerCount[0].c === 0) {
    await db.insert(bannersTable).values([
      { title: "Fresh Vegetables — Farm to Doorstep in Jaipur", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&h=400&fit=crop", linkUrl: "/category/vegetables", isActive: true, sortOrder: 1 },
      { title: "Upto 30% OFF on Dairy Products", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200&h=400&fit=crop", linkUrl: "/category/dairy", isActive: true, sortOrder: 2 },
      { title: "Fresh Fruits Delivered Same Day", imageUrl: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1200&h=400&fit=crop", linkUrl: "/category/fruits", isActive: true, sortOrder: 3 },
    ]);
    console.log("✅ Banners created");
  } else {
    console.log(`✅ Banners already exist (${bannerCount[0].c})`);
  }

  // Ensure coupons exist
  const couponCount = await db.select({ c: sql<number>`count(*)::int` }).from(couponsTable);
  if (couponCount[0].c === 0) {
    await db.insert(couponsTable).values([
      { code: "WELCOME20", discountType: "percentage", discountValue: "20", minOrderValue: "200", maxDiscount: "100", isActive: true },
      { code: "FLAT50",    discountType: "flat",       discountValue: "50", minOrderValue: "300", isActive: true },
      { code: "NTC10",     discountType: "percentage", discountValue: "10", minOrderValue: "150", isActive: true },
      { code: "VEGFRESH",  discountType: "percentage", discountValue: "15", minOrderValue: "250", maxDiscount: "75", isActive: true },
    ]);
    console.log("✅ Coupons created");
  } else {
    console.log(`✅ Coupons already exist (${couponCount[0].c})`);
  }

  const cats = await db.select().from(categoriesTable);
  const catMap = new Map(cats.map(c => [c.slug, c.id]));

  // Add missing products
  const existingProducts = await db.select({ slug: productsTable.slug }).from(productsTable);
  const existingSlugs = new Set(existingProducts.map(p => p.slug));

  const newProducts = [
    { name: "Green Capsicum", slug: "green-capsicum", description: "Fresh green bell peppers, crispy and flavourful for stir-fries.", imageUrl: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&h=400&fit=crop", catSlug: "vegetables", isFeatured: false, variants: [{ unit: "g", unitValue: "250", price: 20, mrp: 28, stock: 80 }] },
    { name: "Cauliflower (Gobhi)", slug: "cauliflower", description: "Fresh white cauliflower, great for gobhi masala and alu-gobhi.", imageUrl: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400&h=400&fit=crop", catSlug: "vegetables", isFeatured: false, variants: [{ unit: "piece", unitValue: "1", price: 35, mrp: 45, stock: 60 }] },
    { name: "Carrot (Gajar)", slug: "carrot", description: "Crunchy fresh carrots, perfect for salads, halwa, and sabzi.", imageUrl: "https://images.unsplash.com/photo-1445282768818-728615cc910a?w=400&h=400&fit=crop", catSlug: "vegetables", isFeatured: false, variants: [{ unit: "kg", unitValue: "1", price: 38, mrp: 50, stock: 120 }] },
    { name: "Mango (Langda)", slug: "mango-langda", description: "Juicy Langda mangoes from Rajasthan, seasonal delight.", imageUrl: "https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=400&h=400&fit=crop", catSlug: "fruits", isFeatured: false, variants: [{ unit: "piece", unitValue: "1", price: 90, mrp: 110, stock: 50 }] },
    { name: "Amul Butter", slug: "amul-butter", description: "Classic Amul salted butter, the taste of India.", imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop", catSlug: "dairy", isFeatured: false, variants: [{ unit: "g", unitValue: "100", price: 52, mrp: 58, stock: 100 }] },
    { name: "Dahi (Curd)", slug: "dahi-curd", description: "Thick and creamy fresh curd, made from full-fat milk daily.", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop", catSlug: "dairy", isFeatured: false, variants: [{ unit: "g", unitValue: "400", price: 45, mrp: 55, stock: 100 }, { unit: "kg", unitValue: "1", price: 99, mrp: 120, stock: 60 }] },
    { name: "Chana Dal (Split Chickpeas)", slug: "chana-dal", description: "Premium quality chana dal, high in protein and fibre.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", catSlug: "grains", isFeatured: false, variants: [{ unit: "g", unitValue: "500", price: 55, mrp: 68, stock: 150 }, { unit: "kg", unitValue: "1", price: 105, mrp: 130, stock: 100 }] },
    { name: "Moong Dal (Yellow)", slug: "moong-dal", description: "Split yellow moong dal, easy to digest and nutritious.", imageUrl: "https://images.unsplash.com/photo-1585670306-19e5e7ee7d2e?w=400&h=400&fit=crop", catSlug: "grains", isFeatured: false, variants: [{ unit: "g", unitValue: "500", price: 52, mrp: 65, stock: 120 }, { unit: "kg", unitValue: "1", price: 98, mrp: 122, stock: 80 }] },
    { name: "Garam Masala", slug: "garam-masala", description: "Aromatic blend of whole spices, freshly ground.", imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop", catSlug: "spices", isFeatured: false, variants: [{ unit: "g", unitValue: "50", price: 45, mrp: 55, stock: 200 }, { unit: "g", unitValue: "100", price: 82, mrp: 100, stock: 150 }] },
    { name: "Parle-G Biscuit", slug: "parle-g-biscuit", description: "India's favourite glucose biscuit for tea-time.", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop", catSlug: "snacks", isFeatured: false, variants: [{ unit: "pack", unitValue: "1", price: 5, mrp: 5, stock: 500 }] },
    { name: "Lay's Classic Chips", slug: "lays-chips", description: "Crispy potato chips, lightly salted and irresistible.", imageUrl: "https://images.unsplash.com/photo-1548041934-f08d514b5fb9?w=400&h=400&fit=crop", catSlug: "snacks", isFeatured: false, variants: [{ unit: "g", unitValue: "26", price: 20, mrp: 20, stock: 200 }] },
    { name: "Coca-Cola 2L", slug: "coca-cola-2l", description: "Chilled Coca-Cola, perfect for family get-togethers.", imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop", catSlug: "beverages", isFeatured: false, variants: [{ unit: "L", unitValue: "2", price: 62, mrp: 75, stock: 80 }] },
    { name: "Green Tea (Lipton)", slug: "lipton-green-tea", description: "Refreshing Lipton green tea bags for daily wellness.", imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop", catSlug: "beverages", isFeatured: false, variants: [{ unit: "bags", unitValue: "25", price: 85, mrp: 100, stock: 100 }, { unit: "bags", unitValue: "100", price: 295, mrp: 350, stock: 50 }] },
    { name: "Dove Beauty Soap", slug: "dove-beauty-soap", description: "Moisturising Dove beauty bar with 1/4 moisturising cream.", imageUrl: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop", catSlug: "personal-care", isFeatured: false, variants: [{ unit: "g", unitValue: "75", price: 48, mrp: 55, stock: 120 }] },
    { name: "Colgate Toothpaste", slug: "colgate-toothpaste", description: "Colgate strong teeth toothpaste for daily protection.", imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop", catSlug: "personal-care", isFeatured: false, variants: [{ unit: "g", unitValue: "200", price: 79, mrp: 90, stock: 100 }, { unit: "g", unitValue: "500", price: 185, mrp: 215, stock: 50 }] },
  ].filter(p => !existingSlugs.has(p.slug));

  for (const p of newProducts) {
    const catId = catMap.get(p.catSlug);
    if (!catId) { console.warn(`⚠️ Category not found: ${p.catSlug}`); continue; }
    const [product] = await db.insert(productsTable).values({
      name: p.name, slug: p.slug, description: p.description, imageUrl: p.imageUrl,
      categoryId: catId, isFeatured: p.isFeatured,
    }).returning();
    await db.insert(productVariantsTable).values(
      p.variants.map(v => ({ productId: product.id, unit: v.unit, unitValue: v.unitValue, price: v.price.toString(), mrp: v.mrp.toString(), stock: v.stock }))
    );
  }
  console.log(`✅ Added ${newProducts.length} new products`);

  // Demo customers
  const existingCustomers = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.role, "customer"));
  const existingEmails = new Set(existingCustomers.map(u => u.email));

  const customerPw = await bcrypt.hash("customer123", 10);
  const demoCustomers = [
    { name: "Rahul Sharma",   email: "rahul@example.com",   phone: "9812345670" },
    { name: "Priya Gupta",    email: "priya@example.com",   phone: "9812345671" },
    { name: "Amit Verma",     email: "amit@example.com",    phone: "9812345672" },
    { name: "Sunita Joshi",   email: "sunita@example.com",  phone: "9812345673" },
    { name: "Vikram Singh",   email: "vikram@example.com",  phone: "9812345674" },
    { name: "Neha Agarwal",   email: "neha@example.com",    phone: "9812345675" },
    { name: "Deepak Meena",   email: "deepak@example.com",  phone: "9812345676" },
    { name: "Kavita Sharma",  email: "kavita@example.com",  phone: "9812345677" },
    { name: "Ravi Bhatnagar", email: "ravi@example.com",    phone: "9812345678" },
    { name: "Anita Saxena",   email: "anita@example.com",   phone: "9812345679" },
  ].filter(c => !existingEmails.has(c.email));

  const newCustomers = demoCustomers.length > 0
    ? await db.insert(usersTable).values(demoCustomers.map(c => ({ ...c, passwordHash: customerPw }))).returning()
    : [];
  console.log(`✅ Added ${newCustomers.length} demo customers (password: customer123)`);

  // Create orders and reviews if there are customers
  const allCustomers = await db.select().from(usersTable).where(eq(usersTable.role, "customer")).limit(10);
  const allProducts = await db.select().from(productsTable).limit(30);
  const allVariants = await db.select().from(productVariantsTable);

  const reviewCount = await db.select({ c: sql<number>`count(*)::int` }).from(reviewsTable);
  if (reviewCount[0].c === 0 && allCustomers.length > 0) {
    const reviewTexts = [
      "Excellent quality! Very fresh and delivered on time.",
      "Good product, will order again.",
      "Nice quality for the price. Packaging was good.",
      "Loved it! Super fresh and great taste.",
      "Decent. Could be fresher but overall fine.",
      "Very happy with this purchase. Exactly as described.",
      "Fresh and clean. Highly recommended!",
      "Great product, but delivery was slightly delayed.",
    ];
    const reviewData = [];
    for (let pi = 0; pi < Math.min(12, allProducts.length); pi++) {
      const numReviews = Math.floor(Math.random() * 3) + 2;
      for (let ri = 0; ri < numReviews && ri < allCustomers.length; ri++) {
        reviewData.push({
          userId: allCustomers[(pi + ri) % allCustomers.length].id,
          productId: allProducts[pi].id,
          rating: Math.floor(Math.random() * 2) + 4,
          comment: reviewTexts[(pi + ri) % reviewTexts.length],
        });
      }
    }
    await db.insert(reviewsTable).values(reviewData);
    console.log(`✅ ${reviewData.length} product reviews created`);
  } else {
    console.log(`✅ Reviews already exist (${reviewCount[0].c})`);
  }

  const orderCount = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
  if (orderCount[0].c === 0 && allCustomers.length > 0) {
    const statuses = ["delivered", "delivered", "delivered", "confirmed", "processing", "out_for_delivery", "pending", "cancelled"] as const;
    for (let i = 0; i < allCustomers.length; i++) {
      const customer = allCustomers[i];
      const product = allProducts[i % allProducts.length];
      const variant = allVariants.find(v => v.productId === product.id);
      if (!variant) continue;
      const qty = Math.ceil(Math.random() * 3) + 1;
      const price = parseFloat(variant.price);
      const subtotal = price * qty;
      const deliveryFee = subtotal >= 499 ? 0 : 40;
      const total = subtotal + deliveryFee;
      const [order] = await db.insert(ordersTable).values({
        userId: customer.id, status: statuses[i % statuses.length],
        paymentMethod: i % 3 === 0 ? "online" : "cod",
        paymentStatus: statuses[i % statuses.length] === "delivered" ? "paid" : "pending",
        subtotal: subtotal.toString(), discount: "0",
        deliveryFee: deliveryFee.toString(), total: total.toString(),
        address: `${10 + i} Raja Park, Near Lal Kothi, Jaipur, Rajasthan - 30200${i}`,
      }).returning();
      await db.insert(orderItemsTable).values({ orderId: order.id, productId: product.id, variantId: variant.id, quantity: qty, price: variant.price, subtotal: subtotal.toString() });
    }
    console.log(`✅ ${allCustomers.length} demo orders created`);
  } else {
    console.log(`✅ Orders already exist (${orderCount[0].c})`);
  }

  console.log("🎉 Upgrade complete!");
  process.exit(0);
}

seedUpgrade().catch(err => { console.error("❌ Upgrade failed:", err); process.exit(1); });

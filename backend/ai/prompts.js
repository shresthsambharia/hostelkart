/**
 * Reusable prompt templates for the AI assistant and system routing.
 */
export const prompts = {
  /**
   * Helper to format ticket data for support drafts or analysis.
   */
  formatTicketSummary: (subject, description, history = []) => {
    const historyString = history
      .map((msg) => `${msg.senderRole} (${msg.senderName}): ${msg.content}`)
      .join('\n');
    return `Please analyze and summarize the following support ticket details:
Subject: ${subject}
Description: ${description}

Message History:
${historyString || 'No history yet.'}`;
  },

  /**
   * Helper to request standard recommendations reasoning.
   */
  generateRecommendationReason: (productName, category, userPreferences = '') => {
    return `Explain briefly in one short sentence why "${productName}" from the "${category}" category is recommended for a student who likes ${userPreferences || 'daily hostel essentials'}.`;
  },

  /**
   * Builds context injection parameters for chat responses.
   */
  buildChatContext: ({
    products = [],
    categories = [],
    coupons = [],
    userInfo = null,
    cart = null,
    wishlist = null,
    recentOrders = []
  }) => {
    return `
=== SYSTEM CONTEXT (DO NOT DISCLOSE DIRECTLY, USE TO ANSWER QUESTIONS) ===
Categories Available: ${JSON.stringify(categories.map(c => c.name))}
Active Promo Coupons: ${JSON.stringify(coupons.map(c => ({ code: c.code, discount: c.discountValue, type: c.discountType })))}

Products Catalog Summary (first 30 items):
${JSON.stringify(products.slice(0, 30).map(p => ({ id: p._id, name: p.name, category: p.category, price: p.price, discount: p.discount, stock: p.stock, isAvailable: p.isAvailable })))}

Active User Session Context:
Role: ${userInfo ? userInfo.role : 'Guest'}
Name: ${userInfo ? userInfo.name : 'Anonymous Student'}
Wallet Balance: ₹${userInfo ? (userInfo.walletBalance || 0) : 0}

User Shopping Cart:
${cart ? JSON.stringify(cart.items.map(i => ({ name: i.product?.name || 'Unknown', quantity: i.quantity }))) : 'Cart is empty'}

User Wishlist:
${wishlist ? JSON.stringify(wishlist.products.map(p => p.name || p)) : 'Wishlist is empty'}

User Recent Orders:
${recentOrders && recentOrders.length > 0 ? JSON.stringify(recentOrders.map(o => ({ orderId: o._id, status: o.orderStatus, amount: o.totalAmount, date: o.createdAt }))) : 'No recent orders found'}
===================================================
`;
  },

  /**
   * Prompt for recommendations model.
   */
  recommendationsPrompt: (products, cart, wishlist, orders, searchHistory = []) => {
    return `
You are a product recommendation system. Recommend up to 5 products from the catalog that match the user's shopping history and preferences.

Available Products:
${JSON.stringify(products.map(p => ({ id: p._id, name: p.name, category: p.category, price: p.price, stock: p.stock })))}

User Context:
- Current Cart: ${JSON.stringify(cart)}
- Wishlist: ${JSON.stringify(wishlist)}
- Recent Orders: ${JSON.stringify(orders)}
- Recent Search History: ${JSON.stringify(searchHistory)}

Output your recommendations as a raw JSON object with the following structure:
{
  "recommendations": [
    {
      "productId": "string matching the id of the product",
      "reason": "short sentence explaining why this product is recommended",
      "confidence": 0.85
    }
  ]
}
Do not write any markdown blocks (like \`\`\`json). Return only valid JSON.
`;
  },

  /**
   * Prompt for product description generation.
   */
  productDescriptionPrompt: (name, category, price, imageUrl = '') => {
    return `
Generate optimized metadata details for a new product with:
Name: ${name}
Category: ${category}
Price: ₹${price}
Image URL: ${imageUrl || 'Not specified'}

Your response must be a raw JSON object with this exact structure:
{
  "title": "Attractive SEO-optimized product title",
  "description": "Engaging marketing description for students",
  "highlights": ["highlight point 1", "highlight point 2", "highlight point 3"],
  "bulletPoints": ["detailed benefit point 1", "detailed benefit point 2", "detailed benefit point 3"],
  "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "searchTags": ["tag1", "tag2", "tag3", "tag4"]
}
Do not write any markdown formatting blocks. Return only valid JSON.
`;
  },

  /**
   * Prompt for converting natural language queries to search parameters.
   */
  searchPrompt: (query, categories) => {
    return `
Parse the user's natural query and map it to product search filters.
Query: "${query}"
Known Catalog Categories: ${JSON.stringify(categories)}

Output a JSON object with this structure:
{
  "category": "string matching one of the known categories (or null)",
  "searchTerms": "extracted text keywords to match against product name/description (or null)",
  "minPrice": number (or null),
  "maxPrice": number (or null)
}

Examples:
- "cheap healthy fruits" -> {"category": "Fruits", "searchTerms": "healthy", "minPrice": null, "maxPrice": 100}
- "medicine for fever under 200" -> {"category": "Medicines", "searchTerms": "fever", "minPrice": null, "maxPrice": 200}
- "something sweet to drink" -> {"category": "Beverages", "searchTerms": "sweet drink", "minPrice": null, "maxPrice": null}

Do not write any markdown blocks. Return only valid JSON.
`;
  },

  /**
   * Prompt for support ticketing suggested answer.
   */
  supportPrompt: (subject, description, category, recentOrders = []) => {
    return `
A student is about to submit a support ticket. Provide a helpful, clear, and direct troubleshooting answer to resolve their issue immediately.
Subject: ${subject}
Description: ${description}
Category: ${category}
User's Recent Orders: ${JSON.stringify(recentOrders)}

If it's a payment issue, advise checking the transaction hash or UPI UTR code on their Order tracking page.
If it's a delivery issue, confirm standard slot timelines (10 AM - 10 PM daily).
Write your response in clean markdown format. Keep it under 150 words.
`;
  }
};

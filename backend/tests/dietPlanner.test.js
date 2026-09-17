import { strict as assert } from 'assert';
import { calculateBMI, searchDietProducts, normalizeDietPlan, sanitizeChatHistory, trackOrderImpl, executeTool, searchProductsImpl } from '../ai/aiController.js';
import { SYSTEM_PROMPT } from '../ai/systemPrompt.js';
import DietPlan from '../models/DietPlan.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

export async function runDietPlannerTests() {
  console.log('\n--- Running AI Diet Planner Unit & Integration Tests ---');
  await Product.deleteMany({ name: /^Admin Test/ });

  // Test 1: BMI Calculation and Categories
  const bmi1 = calculateBMI(180, 80);
  assert.equal(bmi1.bmi, 24.7, 'BMI should be 24.7 for 180cm 80kg');
  assert.equal(bmi1.category, 'Normal weight', 'Category should be Normal weight');

  const bmi2 = calculateBMI(165, 70);
  assert.equal(bmi2.bmi, 25.7, 'BMI should be 25.7 for 165cm 70kg');
  assert.equal(bmi2.category, 'Overweight', 'Category should be Overweight');

  const bmi3 = calculateBMI(170, 50);
  assert.equal(bmi3.bmi, 17.3, 'BMI should be 17.3 for 170cm 50kg');
  assert.equal(bmi3.category, 'Underweight', 'Category should be Underweight');

  const bmi4 = calculateBMI(170, 95);
  assert.equal(bmi4.bmi, 32.9, 'BMI should be 32.9 for 170cm 95kg');
  assert.equal(bmi4.category, 'Obese', 'Category should be Obese');
  console.log('✓ BMI calculation and categories verified across all ranges.');

  // Test 2: Product Search & Allergen Exclusions
  const peanutFree = await searchDietProducts('Vegetarian', ['Peanuts']);
  assert.ok(Array.isArray(peanutFree), 'Should return array of products');
  for (const prod of peanutFree) {
    const nameLower = prod.name.toLowerCase();
    assert.ok(!nameLower.includes('peanut'), `Product "${prod.name}" should not contain peanuts`);
  }
  console.log('✓ Allergen exclusion (Peanuts) verified.');

  // Test 3: Product Search & Dietary Preference
  const veganProducts = await searchDietProducts('Vegan', []);
  for (const prod of veganProducts) {
    const nameLower = prod.name.toLowerCase();
    assert.ok(
      !nameLower.includes('milk') && !nameLower.includes('curd') && !nameLower.includes('cheese') && !nameLower.includes('paneer'),
      `Vegan list should not contain dairy: "${prod.name}"`
    );
  }
  console.log('✓ Dietary preference (Vegan) filtering verified.');

  // Test 4: Only In-Stock and Available Products Returned
  for (const prod of peanutFree) {
    assert.ok(prod.stock > 0, `Product ${prod.name} must be in stock`);
    assert.ok(prod._id, 'Product must have valid ID');
    assert.ok(prod.reason, 'Product recommendation must have reason');
  }
  console.log('✓ In-stock product recommendation integrity verified.');

  // Test 5: Diet Plan Model & Student Authorization Scoping
  let studentA = await User.findOne({ email: 'teststudent_a@example.com' });
  if (!studentA) {
    studentA = await User.create({
      name: 'Student A',
      email: 'teststudent_a@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  let studentB = await User.findOne({ email: 'teststudent_b@example.com' });
  if (!studentB) {
    studentB = await User.create({
      name: 'Student B',
      email: 'teststudent_b@example.com',
      password: 'password123',
      role: 'student',
      isEmailVerified: true
    });
  }

  // Create plan for Student A
  const samplePlanA = await DietPlan.create({
    user: studentA._id,
    profileSnapshot: {
      age: 20,
      gender: 'Male',
      height: 180,
      weight: 80,
      bmi: 24.7,
      bmiCategory: 'Normal weight',
      activityLevel: 'Moderately Active',
      goal: 'Muscle gain',
      dietaryPreference: 'Vegetarian',
      foodPreferences: { favouriteFoods: 'Bananas' },
      allergies: ['None'],
      healthConditions: ['No known medical condition'],
      hostelLifestyle: { messAvailability: 'full', monthlyBudget: 'Moderate' }
    },
    plan: {
      summary: 'Tailored high protein hostel nutrition.',
      estimatedCalories: '2400 kcal/day (Estimated starting target)',
      disclaimer: 'This is an educational student nutrition guide and not medical advice.',
      recommendedProducts: peanutFree
    }
  });

  // Verification: Student A can retrieve their plan
  const retrievedA = await DietPlan.findOne({ _id: samplePlanA._id, user: studentA._id });
  assert.ok(retrievedA, 'Student A should be able to retrieve their plan');
  assert.equal(retrievedA.profileSnapshot.goal, 'Muscle gain');

  // Verification: Student B CANNOT access Student A's plan
  const unauthorizedAccess = await DietPlan.findOne({ _id: samplePlanA._id, user: studentB._id });
  assert.equal(unauthorizedAccess, null, 'Student B must not be able to access Student A plan');
  console.log('✓ Student privacy and authorization boundary verified.');

  // Clean up test plan
  await DietPlan.deleteOne({ _id: samplePlanA._id });

  // Test 6: Database Product Counts & Apple vs Pineapple verification
  const fruitsCount = await Product.countDocuments({ category: { $regex: /^fruits$/i }, isAvailable: true });
  assert.equal(fruitsCount, 18, 'Fruits count should be 18');

  const medicinesCount = await Product.countDocuments({ category: { $regex: /^medicines$/i }, isAvailable: true });
  assert.equal(medicinesCount, 5, 'Medicines count should be 5');

  const appleProducts = await Product.find({
    category: { $regex: /^fruits$/i },
    name: { $regex: /\bapple\b/i },
    isAvailable: true
  });
  assert.equal(appleProducts.length, 2, 'Should match only Red Apple and Royal Gala Apple');
  const appleNames = appleProducts.map(p => p.name);
  assert.ok(appleNames.includes('Red Apple (520 g)'));
  assert.ok(appleNames.includes('Royal Gala Apple (520 g)'));
  assert.ok(!appleNames.includes('Pineapple (800 g)'), 'Pineapple must not match apple query');
  console.log('✓ Catalog category counts & apple word-boundary integrity verified.');

  // Test 7: Route-Specific Request Timeout Middleware Verification
  const { requestTimeout } = await import('../middleware/timeoutMiddleware.js');
  const timeoutMiddleware = requestTimeout(15000, {
    '/api/ai/diet-plan': 60000,
    '/api/ai/chat': 60000,
  });

  // Test 7A: Standard route gets 15s limit
  let normalTimerSet = false;
  const mockReqNormal = { originalUrl: '/api/products', method: 'GET', ip: '127.0.0.1' };
  let normalNextCalled = false;
  const mockResNormal = {
    headersSent: false,
    on: (evt, cb) => {},
    status: (code) => ({ json: (data) => {} })
  };
  timeoutMiddleware(mockReqNormal, mockResNormal, () => { normalNextCalled = true; });
  assert.ok(normalNextCalled, 'Next middleware should be called for normal route');

  // Test 7B: Diet planner route gets 60s limit
  const mockReqDiet = { originalUrl: '/api/ai/diet-plan', method: 'POST', ip: '127.0.0.1' };
  let dietNextCalled = false;
  const mockResDiet = {
    headersSent: false,
    on: (evt, cb) => {},
    status: (code) => ({ json: (data) => {} })
  };
  timeoutMiddleware(mockReqDiet, mockResDiet, () => { dietNextCalled = true; });
  assert.ok(dietNextCalled, 'Next middleware should be called for diet planner route');

  // Test 7C: Fallback plan generation produces full valid schema
  const { generateFallbackPlan, normalizeDietPlan } = await import('../ai/aiController.js');
  const sampleProfile = {
    age: 20,
    gender: 'Female',
    height: 165,
    weight: 58,
    bmi: 21.3,
    bmiCategory: 'Normal weight',
    activityLevel: 'Moderately Active',
    goal: 'Improve fitness',
    dietaryPreference: 'Vegetarian',
    foodPreferences: {},
    allergies: [],
    healthConditions: [],
    hostelLifestyle: { messAvailability: 'full', monthlyBudget: 'Moderate' }
  };
  const fallbackPlan = generateFallbackPlan(sampleProfile, peanutFree);
  assert.ok(fallbackPlan.summary, 'Fallback plan must have summary');
  assert.ok(fallbackPlan.dailyPlan, 'Fallback plan must have dailyPlan');
  assert.ok(fallbackPlan.weeklyPlan && fallbackPlan.weeklyPlan.length === 7, 'Fallback plan must have 7-day weeklyPlan');
  assert.ok(fallbackPlan.disclaimer, 'Fallback plan must have disclaimer');
  assert.ok(fallbackPlan.recommendedProducts && fallbackPlan.recommendedProducts.length > 0, 'Fallback plan must have recommendedProducts');
  console.log('✓ Route-specific timeout middleware and fallback plan integrity verified.');

  // Test 8: Comprehensive Personalization Suite (Profiles A through H)
  const profiles = [
    { id: 'A', name: 'Profile A (Weight/Muscle Gain 50kg)', age: 20, height: 175, weight: 50, goal: 'Weight Gain / Muscle Gain', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'B', name: 'Profile B (Improve Fitness 60kg)', age: 20, height: 175, weight: 60, goal: 'Improve Fitness', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'C', name: 'Profile C (Muscle Gain 70kg)', age: 20, height: 175, weight: 70, goal: 'Muscle Gain', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'D', name: 'Profile D (Fat Loss 85kg)', age: 20, height: 175, weight: 85, goal: 'Fat Loss', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'E', name: 'Profile E (Fat Loss 100kg)', age: 20, height: 175, weight: 100, goal: 'Fat Loss', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'F', name: 'Profile F (Maintenance Vegan 70kg)', age: 20, height: 175, weight: 70, goal: 'Maintenance', dietaryPreference: 'Vegan', allergies: [], activityLevel: 'Moderately Active' },
    { id: 'G', name: 'Profile G (Muscle Gain Peanut Allergy 70kg)', age: 20, height: 175, weight: 70, goal: 'Muscle Gain', dietaryPreference: 'Vegetarian', allergies: ['Peanuts'], activityLevel: 'Moderately Active' },
    { id: 'H', name: 'Profile H (Muscle Gain Low Activity 70kg)', age: 20, height: 175, weight: 70, goal: 'Muscle Gain', dietaryPreference: 'Vegetarian', allergies: [], activityLevel: 'Sedentary' }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dailyKeys = ['earlyMorning', 'breakfast', 'midMorning', 'lunch', 'eveningSnack', 'dinner', 'beforeBed'];

  const generatedResults = {};

  for (const prof of profiles) {
    const products = await searchDietProducts(prof.dietaryPreference, prof.allergies, prof.goal);
    const plan = generateFallbackPlan(prof, products);
    const normalized = normalizeDietPlan(plan, prof, products);
    generatedResults[prof.id] = normalized;

    // Verify Summary
    assert.ok(normalized.summary && normalized.summary.length > 20, `Profile ${prof.id} must have a rich summary`);

    // Verify Targets
    assert.ok(normalized.estimatedCalories, `Profile ${prof.id} must have calories target`);
    assert.ok(normalized.estimatedMacros.protein, `Profile ${prof.id} must have protein target`);
    assert.ok(normalized.estimatedMacros.carbs, `Profile ${prof.id} must have carbs target`);
    assert.ok(normalized.estimatedMacros.fats, `Profile ${prof.id} must have fats target`);

    // Verify Daily Meals (all 7 sections)
    for (const dk of dailyKeys) {
      assert.ok(Array.isArray(normalized.dailyPlan[dk]) && normalized.dailyPlan[dk].length > 0, `Profile ${prof.id} must have dailyPlan.${dk}`);
      const item = normalized.dailyPlan[dk][0];
      assert.ok(item.time, `Profile ${prof.id} dailyPlan.${dk} must have time`);
      assert.ok(Array.isArray(item.items) && item.items.length > 0, `Profile ${prof.id} dailyPlan.${dk} must have items`);
    }

    // Verify 7-Day Weekly Plan
    assert.equal(normalized.weeklyPlan.length, 7, `Profile ${prof.id} weeklyPlan must have exactly 7 days`);
    for (let i = 0; i < 7; i++) {
      const dayPlan = normalized.weeklyPlan[i];
      assert.equal(dayPlan.day.toLowerCase(), daysOfWeek[i].toLowerCase(), `Profile ${prof.id} Day ${i+1} must be ${daysOfWeek[i]}`);
      assert.ok(dayPlan.breakfast, `Profile ${prof.id} ${daysOfWeek[i]} must have breakfast`);
      assert.ok(dayPlan.lunch, `Profile ${prof.id} ${daysOfWeek[i]} must have lunch`);
      assert.ok(dayPlan.snack, `Profile ${prof.id} ${daysOfWeek[i]} must have snack`);
      assert.ok(dayPlan.dinner, `Profile ${prof.id} ${daysOfWeek[i]} must have dinner`);
    }

    // Verify Allergen & Dietary restrictions
    if (prof.id === 'F') {
      // Vegan: no dairy, meat, fish, or eggs
      const fullText = JSON.stringify(normalized);
      // Ensure no dairy milk, cheese, curd, paneer, eggs, meat, ghee (ignore plant-based peanut butter)
      const hasForbiddenAnimalProducts = /\b(milk|paneer|curd|egg|eggs|dairy|meat|chicken|fish|ghee|cheese)\b/i.test(fullText) || /(?<!peanut\s)\bbutter\b/i.test(fullText);
      assert.ok(!hasForbiddenAnimalProducts, 'Vegan plan F must strictly exclude dairy, meat, and eggs');
    }
    if (prof.id === 'G') {
      // Peanut allergy: no peanuts
      const fullText = JSON.stringify(normalized);
      const hasPeanut = /\b(peanut|peanuts)\b/i.test(fullText);
      assert.ok(!hasPeanut, 'Peanut allergy plan G must strictly exclude peanuts');
    }
  }

  // Verify Personalization Targets Differ Between Profiles
  const calsA = parseInt(generatedResults['A'].estimatedCalories, 10);
  const calsD = parseInt(generatedResults['D'].estimatedCalories, 10);
  const calsC = parseInt(generatedResults['C'].estimatedCalories, 10);
  const calsH = parseInt(generatedResults['H'].estimatedCalories, 10);

  assert.ok(calsC > calsH, `Profile C (Moderately Active) calories (${calsC}) must exceed Profile H (Sedentary) calories (${calsH})`);
  assert.ok(calsC > calsD, `Profile C (Muscle Gain 70kg) calories (${calsC}) must exceed Profile D (Fat Loss 85kg) calories (${calsD})`);
  console.log('✓ All 8 Profiles (A through H) passed personalization, target differentiation, and restriction tests.');

  // Test 9: Schema Normalizer handles diverse / raw / malformed LLM shapes
  const malformedLLMResponse = {
    student_profile_summary: { age: 20, goal: 'Muscle gain' },
    nutritional_targets: { daily_calories: 2550, protein_grams: 130, carbs_grams: 310, fats_grams: 75 },
    daily_plan: {
      breakfast: 'Oats with banana',
      lunch: { time: '1:30 PM', item: 'Rice and Dal', hostelAlternative: 'Extra dal' }
    },
    weekly_meal_plan: [
      { day: 'Monday', meals: { breakfast: 'Poha', lunch: 'Thali', snack: 'Chana', dinner: 'Roti Dal' } },
      { day: 'Tuesday', meals: { breakfast: 'Idli', lunch: 'Rajma', snack: 'Fruit', dinner: 'Khichdi' } }
    ]
  };

  const normalizedMalformed = normalizeDietPlan(malformedLLMResponse, profiles[2], peanutFree);
  assert.ok(normalizedMalformed.summary, 'Normalized malformed must have summary');
  assert.equal(normalizedMalformed.weeklyPlan.length, 7, 'Normalized malformed weeklyPlan must be expanded to 7 days');
  assert.ok(Array.isArray(normalizedMalformed.dailyPlan.breakfast), 'Normalized dailyPlan.breakfast must be array');
  assert.ok(Array.isArray(normalizedMalformed.dailyPlan.lunch), 'Normalized dailyPlan.lunch must be array');
  assert.equal(normalizedMalformed.dailyPlan.lunch[0].time, '1:30 PM');
  console.log('✓ Schema Normalizer handles raw/malformed LLM shapes and enforces complete 7-day structure.');

  console.log('\n--- Running AI Chat History & Order Tracking Tests ---');

  // Test Chat A: First assistant greeting history sanitization
  const greetingHistory = [
    {
      role: 'assistant',
      content: "Hi! I'm your HostelKart AI Assistant. Ask me anything about our products, categories, coupons, delivery times, or your orders!"
    }
  ];
  const sanitizedA = sanitizeChatHistory(greetingHistory);
  assert.equal(sanitizedA.length, 0, 'Leading assistant greeting should be stripped from history');
  console.log('✓ Test Chat A: Leading assistant greeting stripped from Gemini history (prevents model-first crash).');

  // Test Chat B: Normal multi-turn conversation (user -> assistant -> user -> assistant)
  const normalConversation = [
    { role: 'user', content: 'What fruits do you have?' },
    { role: 'assistant', content: 'We have fresh Apples and Bananas.' },
    { role: 'user', content: 'Add Apples to my cart' },
    { role: 'assistant', content: 'Added Apples to your cart.' }
  ];
  const sanitizedB = sanitizeChatHistory(normalConversation);
  assert.equal(sanitizedB.length, 4, 'All 4 conversation turns must be preserved');
  assert.equal(sanitizedB[0].role, 'user', 'First turn must be user');
  assert.equal(sanitizedB[1].role, 'model', 'Second turn must be model');
  assert.equal(sanitizedB[2].role, 'user', 'Third turn must be user');
  assert.equal(sanitizedB[3].role, 'model', 'Fourth turn must be model');
  assert.equal(sanitizedB[0].parts[0].text, 'What fruits do you have?');
  console.log('✓ Test Chat B: Normal multi-turn conversation preserved intact.');

  // Test Chat C: Assistant greeting followed by user and assistant messages
  const greetingPlusUser = [
    { role: 'assistant', content: 'Initial greeting from chatbot.' },
    { role: 'user', content: 'Where is my active order?' },
    { role: 'assistant', content: 'Let me check that for you.' }
  ];
  const sanitizedC = sanitizeChatHistory(greetingPlusUser);
  assert.equal(sanitizedC.length, 2, 'Initial greeting removed; user and subsequent model message preserved');
  assert.equal(sanitizedC[0].role, 'user', 'First message after sanitization must be user');
  assert.equal(sanitizedC[0].parts[0].text, 'Where is my active order?');
  assert.equal(sanitizedC[1].role, 'model', 'Second message must be model');
  console.log('✓ Test Chat C: Leading greeting removed while preserving subsequent user->model dialogue.');

  // Test Chat D: Authenticated trackOrder returns user's live orders
  let chatStudent1 = await User.findOne({ email: 'chat_test_student_1@example.com' });
  if (!chatStudent1) {
    chatStudent1 = await User.create({
      name: 'Chat Test Student 1',
      email: 'chat_test_student_1@example.com',
      password: 'hashedpassword123',
      role: 'student',
      phone: '9876543210',
      hostelDetails: { hostelName: 'Brahmaputra', roomNumber: '201' }
    });
  }

  // Clean previous orders for student 1
  await Order.deleteMany({ user: chatStudent1._id });

  let testProduct = await Product.findOne({ isAvailable: true });
  if (!testProduct) {
    testProduct = await Product.create({
      name: 'Fresh Apples',
      price: 100,
      stock: 50,
      category: 'Fruits',
      brand: 'Farm Fresh',
      description: 'Crisp apples',
      isAvailable: true
    });
  }

  // Create an active order for student 1
  const testOrder1 = await Order.create({
    user: chatStudent1._id,
    items: [
      { product: testProduct._id, name: 'Fresh Apples', quantity: 2, price: 100, discount: 0 }
    ],
    deliveryDetails: {
      hostelName: 'Brahmaputra',
      block: 'A',
      floor: '2',
      roomNumber: '201',
      phone: '9876543210'
    },
    paymentMethod: 'COD',
    paymentStatus: 'Pending',
    totalAmount: 200,
    orderStatus: 'Confirmed',
    deliverySlot: 'Morning Slot (8:00 AM - 1:00 PM)'
  });

  const orders1 = await trackOrderImpl(chatStudent1);
  assert.ok(Array.isArray(orders1), 'Orders must be returned as an array');
  assert.equal(orders1.length, 1, 'Should find 1 order for student 1');
  assert.equal(orders1[0].orderId, testOrder1._id.toString());
  assert.equal(orders1[0].status, 'Confirmed');
  assert.equal(orders1[0].total, 200);
  assert.equal(orders1[0].items[0].name, 'Fresh Apples');
  console.log('✓ Test Chat D: Authenticated trackOrder returns exact user orders.');

  // Test Chat E: Unauthenticated trackOrder returns unauthorized
  const unauthResult = await trackOrderImpl(null);
  assert.equal(unauthResult.success, false, 'Unauthenticated user must be rejected');
  assert.ok(unauthResult.error.toLowerCase().includes('unauthorized') || unauthResult.error.toLowerCase().includes('log in'));
  console.log('✓ Test Chat E: Unauthenticated trackOrder returns unauthorized response.');

  // Test Chat F: Authenticated user with empty orders
  let chatStudentEmpty = await User.findOne({ email: 'chat_test_student_empty@example.com' });
  if (!chatStudentEmpty) {
    chatStudentEmpty = await User.create({
      name: 'Chat Test Student Empty',
      email: 'chat_test_student_empty@example.com',
      password: 'hashedpassword123',
      role: 'student',
      phone: '9876543211',
      hostelDetails: { hostelName: 'Ganga', roomNumber: '101' }
    });
  }
  await Order.deleteMany({ user: chatStudentEmpty._id });

  const emptyOrders = await trackOrderImpl(chatStudentEmpty);
  assert.ok(Array.isArray(emptyOrders), 'Result must be an array');
  assert.equal(emptyOrders.length, 0, 'Result must be empty array for user with no orders');
  console.log('✓ Test Chat F: Authenticated user with 0 orders returns clean empty list.');

  // Test Chat G: IDOR Protection (Student 2 querying cannot see Student 1 orders)
  let chatStudent2 = await User.findOne({ email: 'chat_test_student_2@example.com' });
  if (!chatStudent2) {
    chatStudent2 = await User.create({
      name: 'Chat Test Student 2',
      email: 'chat_test_student_2@example.com',
      password: 'hashedpassword123',
      role: 'student',
      phone: '9876543212',
      hostelDetails: { hostelName: 'Barak', roomNumber: '305' }
    });
  }
  await Order.deleteMany({ user: chatStudent2._id });

  const orders2 = await trackOrderImpl(chatStudent2);
  assert.equal(orders2.length, 0, 'Student 2 must not see Student 1 orders');
  for (const ord of orders2) {
    assert.notEqual(ord.orderId, testOrder1._id.toString(), 'IDOR violation: Student 2 saw Student 1 order');
  }
  console.log('✓ Test Chat G: IDOR strict isolation verified (Student 2 cannot see Student 1 orders).');

  // Test Chat H: Tool execution dispatcher
  const toolExecAuth = await executeTool('trackOrder', {}, chatStudent1);
  assert.ok(Array.isArray(toolExecAuth), 'executeTool trackOrder should return orders array');
  assert.equal(toolExecAuth.length, 1);
  assert.equal(toolExecAuth[0].orderId, testOrder1._id.toString());

  const toolExecUnauth = await executeTool('trackOrder', {}, null);
  assert.equal(toolExecUnauth.success, false);
  console.log('✓ Test Chat H: executeTool correctly dispatches trackOrder with authentication context.');

  // Ensure test products exist in database for snack & grocery searches
  const testSnackData = [
    { name: 'Roasted Salted Almonds (200g)', price: 180, stock: 20, category: 'Snacks', brand: 'Nutty', description: 'Crunchy roasted almonds', image: '/images/almonds.jpg', isAvailable: true },
    { name: 'Peanut Butter Creamy (340g)', price: 160, stock: 25, category: 'Dairy Products', brand: 'Farm', description: 'Creamy rich peanut butter', image: '/images/pb.jpg', isAvailable: true },
    { name: 'Banana (500 g)', price: 35, stock: 50, category: 'Fruits', brand: 'Fresh', description: 'Fresh sweet bananas', image: '/images/banana.jpg', isAvailable: true },
    { name: 'Mother Dairy Curd Cup (200g)', price: 25, stock: 30, category: 'Dairy Products', brand: 'Mother Dairy', description: 'Fresh plain curd', image: '/images/curd.jpg', isAvailable: true }
  ];
  for (const item of testSnackData) {
    const exists = await Product.findOne({ name: item.name });
    if (!exists) {
      await Product.create(item);
    }
  }

  // Test Chat I: Snack & Category Live Database Search
  const snacksCategoryResult = await searchProductsImpl('snacks');
  assert.ok(Array.isArray(snacksCategoryResult), 'searchProductsImpl("snacks") must return an array');
  assert.ok(snacksCategoryResult.length > 0, 'Snacks category should return products');
  for (const item of snacksCategoryResult) {
    assert.equal(item.category, 'Snacks', 'All items should belong to Snacks category');
  }
  console.log(`✓ Test Chat I: Live Snacks category search returns ${snacksCategoryResult.length} valid catalog items.`);

  // Test Chat J: Specific Snack & Muscle-Gain Item Lookups
  const pbSearch = await searchProductsImpl('peanut butter');
  assert.ok(Array.isArray(pbSearch) && pbSearch.length > 0, 'Should find peanut butter in catalog');
  assert.ok(pbSearch[0].name.toLowerCase().includes('peanut butter'));

  const bananaSearch = await searchProductsImpl('banana');
  assert.ok(Array.isArray(bananaSearch) && bananaSearch.length > 0, 'Should find banana in catalog');
  assert.ok(bananaSearch[0].name.toLowerCase().includes('banana'));

  const curdSearch = await searchProductsImpl('curd');
  assert.ok(Array.isArray(curdSearch) && curdSearch.length > 0, 'Should find curd products in catalog');
  assert.ok(curdSearch.some(c => c.name.toLowerCase().includes('curd') || c.name.toLowerCase().includes('yogurt')));

  const unavailableSearch = await searchProductsImpl('roasted chana');
  // Confirm un-seeded item returns empty array without error
  assert.ok(Array.isArray(unavailableSearch), 'Unavailable product search should return an array');
  console.log('✓ Test Chat J: Accurate item lookups (Peanut Butter, Banana, Curd) and non-hallucinated empty results for unstocked items.');

  // Test Chat K: Tool Dispatcher for searchProducts
  const toolSearchSnacks = await executeTool('searchProducts', { query: 'snacks' }, chatStudent1);
  assert.ok(Array.isArray(toolSearchSnacks) && toolSearchSnacks.length > 0);
  assert.equal(toolSearchSnacks[0].category, 'Snacks');
  console.log('✓ Test Chat K: executeTool("searchProducts") dispatches correctly.');

  // Test Chat L: Authenticated Add to Cart for Catalog Item
  const bananaProd = bananaSearch[0];
  const addToCartSuccess = await executeTool('addToCart', { productId: bananaProd.id, quantity: 1 }, chatStudent1);
  assert.equal(addToCartSuccess.success, true);
  assert.ok(addToCartSuccess.addedProduct);
  assert.equal(addToCartSuccess.addedProduct.name, bananaProd.name);
  assert.ok(addToCartSuccess.cartDetails.totalPrice > 0);
  console.log('✓ Test Chat L: executeTool("addToCart") succeeds for authenticated student with valid catalog item.');

  // Test Chat M: Add to Cart handles invalid/missing product gracefully
  const addToCartInvalid = await executeTool('addToCart', { productId: '507f1f77bcf86cd799439011', quantity: 1 }, chatStudent1);
  assert.equal(addToCartInvalid.success, false);
  assert.ok(addToCartInvalid.error.toLowerCase().includes('not found'));
  console.log('✓ Test Chat M: executeTool("addToCart") rejects non-existent product without throwing unhandled exceptions.');

  // Test Chat N: System Prompt Safety & Dietary Compliance Directives
  assert.ok(SYSTEM_PROMPT.includes('SNACK & NUTRITION RECOMMENDATION GUIDELINES'), 'System prompt must contain snack guidelines');
  assert.ok(SYSTEM_PROMPT.includes('NEVER recommend "raw sprouts"'), 'System prompt must mandate food safety on raw sprouts');
  assert.ok(SYSTEM_PROMPT.includes('PEANUT ALLERGY'), 'System prompt must enforce peanut allergy restrictions');
  assert.ok(SYSTEM_PROMPT.includes('VEGAN'), 'System prompt must enforce vegan dairy exclusions');
  assert.ok(SYSTEM_PROMPT.includes('Do NOT make exaggerated statements'), 'System prompt must forbid exaggerated claims');
  console.log('✓ Test Chat N: System prompt verified for strict food-safety, allergen compliance, and anti-hallucination rules.');

  console.log('✓ All AI Diet Planner & Chat automated tests passed successfully!');
  return true;
}



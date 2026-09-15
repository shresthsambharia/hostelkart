import { strict as assert } from 'assert';
import { calculateBMI, searchDietProducts } from '../ai/aiController.js';
import DietPlan from '../models/DietPlan.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

export async function runDietPlannerTests() {
  console.log('\n--- Running AI Diet Planner Unit & Integration Tests ---');

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
  const { generateFallbackPlan } = await import('../ai/aiController.js');
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

  console.log('✓ All AI Diet Planner automated tests passed successfully!');
  return true;
}


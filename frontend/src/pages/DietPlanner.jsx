import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Heart, Activity, Target, Utensils, AlertCircle, 
  Clock, Droplets, ShieldAlert, CheckCircle2, ChevronRight, 
  ChevronLeft, ShoppingCart, RefreshCw, Send, Trash2, Calendar, 
  BookOpen, HelpCircle, Dumbbell, Coffee, Sun, Moon, Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dietAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';

const DietPlanner = () => {
  const { user } = useAuth();

  // Wizard Step State (1 to 6)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    age: '20',
    gender: 'Male',
    height: '175',
    weight: '70',
    activityLevel: 'Moderately Active',
    goal: 'Muscle gain',
    dietaryPreference: 'Vegetarian',
    favouriteFoods: '',
    dislikedFoods: '',
    inaccessibleFoods: '',
    allergies: ['None'],
    otherAllergies: '',
    healthConditions: ['No known medical condition'],
    otherHealthConditions: '',
    sleepDuration: '7-8 hours',
    workoutFrequency: '3-4 days/week',
    dailyWaterIntake: '2.5 - 3.0 Liters',
    mealTimings: 'Breakfast 8:30 AM, Lunch 1:30 PM, Dinner 8:30 PM',
    messAvailability: 'full',
    monthlyBudget: 'Moderate',
  });

  // Generated Plan & History State
  const [activePlan, setActivePlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'foods' | 'products' | 'chat'
  
  // Follow-up Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);

  // Calculate live BMI
  const heightM = Number(formData.height) / 100;
  const liveBmi = heightM > 0 && Number(formData.weight) > 0 
    ? (Number(formData.weight) / (heightM * heightM)).toFixed(1) 
    : 0;

  const getBmiCategory = (bmi) => {
    if (bmi <= 0) return { label: 'Unknown', color: 'text-slate-400 bg-slate-100' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (bmi < 25) return { label: 'Normal weight', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Obese', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const bmiCat = getBmiCategory(liveBmi);

  // Fetch saved plans on mount
  useEffect(() => {
    if (!user) return;
    const loadSavedPlans = async () => {
      try {
        const { data } = await dietAPI.getAll();
        if (data && data.plans) {
          setSavedPlans(data.plans);
        }
      } catch (err) {
        console.error('Failed to load saved diet plans:', err);
      }
    };
    loadSavedPlans();
  }, [user]);

  // Handle Form Change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  const toggleAllergy = (allergen) => {
    setFormData(prev => {
      let updated = [...prev.allergies];
      if (allergen === 'None') {
        return { ...prev, allergies: ['None'], otherAllergies: '' };
      }
      updated = updated.filter(a => a !== 'None');
      if (updated.includes(allergen)) {
        updated = updated.filter(a => a !== allergen);
        if (updated.length === 0) updated = ['None'];
      } else {
        updated.push(allergen);
      }
      return { ...prev, allergies: updated };
    });
  };

  const toggleCondition = (cond) => {
    setFormData(prev => {
      let updated = [...prev.healthConditions];
      if (cond === 'No known medical condition') {
        return { ...prev, healthConditions: ['No known medical condition'], otherHealthConditions: '' };
      }
      updated = updated.filter(c => c !== 'No known medical condition');
      if (updated.includes(cond)) {
        updated = updated.filter(c => c !== cond);
        if (updated.length === 0) updated = ['No known medical condition'];
      } else {
        updated.push(cond);
      }
      return { ...prev, healthConditions: updated };
    });
  };

  // Submit Plan Generation
  const handleGenerate = async () => {
    if (!formData.height || !formData.weight || Number(formData.height) <= 0 || Number(formData.weight) <= 0) {
      setErrorMsg('Please enter a valid height and weight.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        age: Number(formData.age) || 20,
        gender: formData.gender,
        height: Number(formData.height),
        weight: Number(formData.weight),
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        dietaryPreference: formData.dietaryPreference,
        foodPreferences: {
          favouriteFoods: formData.favouriteFoods,
          dislikedFoods: formData.dislikedFoods,
          inaccessibleFoods: formData.inaccessibleFoods
        },
        allergies: formData.allergies,
        otherAllergies: formData.otherAllergies,
        healthConditions: formData.healthConditions,
        otherHealthConditions: formData.otherHealthConditions,
        hostelLifestyle: {
          sleepDuration: formData.sleepDuration,
          workoutFrequency: formData.workoutFrequency,
          dailyWaterIntake: formData.dailyWaterIntake,
          mealTimings: formData.mealTimings,
          messAvailability: formData.messAvailability,
          monthlyBudget: formData.monthlyBudget
        }
      };

      const { data } = await dietAPI.generate(payload);
      if (data && data.plan) {
        setActivePlan(data);
        setChatMessages([
          { role: 'assistant', text: `Hello! I've created your personalized **${data.profile?.goal || 'nutrition'}** plan. Ask me any follow-up questions or request substitutions!` }
        ]);
        // Refresh saved list
        const refreshed = await dietAPI.getAll();
        if (refreshed.data?.plans) setSavedPlans(refreshed.data.plans);
      }
    } catch (err) {
      console.error('Diet plan generation failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to generate diet plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load a Saved Plan
  const handleLoadPlan = async (id) => {
    try {
      const { data } = await dietAPI.getById(id);
      if (data && data.plan) {
        setActivePlan(data);
        setChatMessages([
          { role: 'assistant', text: `Loaded your saved **${data.profile?.goal || 'nutrition'}** plan from ${new Date(data.createdAt).toLocaleDateString()}. How can I assist you with this plan?` }
        ]);
      }
    } catch (err) {
      console.error('Failed to load plan by ID:', err);
    }
  };

  // Delete a Saved Plan
  const handleDeletePlan = async (id, e) => {
    e.stopPropagation();
    try {
      await dietAPI.delete(id);
      setSavedPlans(prev => prev.filter(p => p._id !== id));
      if (activePlan?.dietPlanId === id) {
        setActivePlan(null);
      }
    } catch (err) {
      console.error('Failed to delete diet plan:', err);
    }
  };

  // Follow-up Chat Message Handler
  const handleSendChat = async (presetText = null) => {
    const messageToSend = presetText || chatInput;
    if (!messageToSend.trim() || isChatSending) return;

    const newHistory = [...chatMessages, { role: 'user', text: messageToSend }];
    setChatMessages(newHistory);
    if (!presetText) setChatInput('');
    setIsChatSending(true);

    try {
      const { data } = await dietAPI.chat({
        message: messageToSend,
        planContext: {
          goal: activePlan?.profile?.goal,
          dietaryPreference: activePlan?.profile?.dietaryPreference,
          allergies: activePlan?.profile?.allergies,
          healthConditions: activePlan?.profile?.healthConditions
        }
      });
      setChatMessages([...newHistory, { role: 'assistant', text: data.reply }]);
    } catch (err) {
      setChatMessages([...newHistory, { role: 'assistant', text: 'Sorry, I ran into an issue answering your question. Please try again.' }]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Title Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-primary-700 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-emerald-100">
              <Sparkles size={14} className="animate-spin-slow" />
              <span>HostelKart Nutrition Co-Pilot</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              AI Personalized Student Diet Planner
            </h1>
            <p className="text-emerald-100 max-w-2xl text-sm sm:text-base leading-relaxed">
              Get an affordable, practical 7-day meal schedule engineered specifically for hostel life, mess routines, and corridor deliveries.
            </p>
          </div>
        </div>

        {/* Safety & Medical Disclaimer Notice */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs sm:text-sm text-amber-900 shadow-sm">
          <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <span className="font-bold">Medical Safety & Transparency: </span>
            This assistant provides general educational nutrition recommendations adapted to hostel living. It is <strong className="underline">not medical advice, diagnosis, or clinical prescription</strong>. Always consult a certified healthcare professional or registered dietitian for diagnosed medical conditions.
          </div>
        </div>

        {/* Main Content Area: Form Wizard OR Result Dashboard */}
        {!activePlan ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            
            {/* Step Wizard Progress Bar */}
            <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-6">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                  { num: 1, label: 'Basic Info' },
                  { num: 2, label: 'Goal' },
                  { num: 3, label: 'Preference' },
                  { num: 4, label: 'Food & Allergies' },
                  { num: 5, label: 'Health' },
                  { num: 6, label: 'Hostel Life' }
                ].map(step => (
                  <div key={step.num} className="flex flex-col items-center">
                    <button
                      onClick={() => setCurrentStep(step.num)}
                      className={`w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                        currentStep === step.num
                          ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100'
                          : currentStep > step.num
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {currentStep > step.num ? <CheckCircle2 size={18} /> : step.num}
                    </button>
                    <span className="text-[11px] font-medium text-slate-500 mt-1 hidden sm:block">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Wizard Body */}
            <div className="p-6 sm:p-10 max-w-3xl mx-auto">
              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 1: Tell us about yourself</h3>
                    <p className="text-sm text-slate-500">Provide basic measurements to calculate your screening BMI and basal energy requirements.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Age</label>
                      <input 
                        type="number" 
                        min="15" 
                        max="80" 
                        value={formData.age} 
                        onChange={(e) => handleChange('age', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Gender / Sex</label>
                      <select 
                        value={formData.gender} 
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Height (cm)</label>
                      <input 
                        type="number" 
                        min="100" 
                        max="250" 
                        value={formData.height} 
                        onChange={(e) => handleChange('height', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. 175"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Weight (kg)</label>
                      <input 
                        type="number" 
                        min="30" 
                        max="250" 
                        value={formData.weight} 
                        onChange={(e) => handleChange('weight', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        placeholder="e.g. 70"
                      />
                    </div>
                  </div>

                  {/* Live BMI Preview Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500 uppercase">Estimated Screening BMI</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-black text-slate-900">{liveBmi > 0 ? liveBmi : '--'}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${bmiCat.color}`}>
                          {bmiCat.label}
                        </span>
                      </div>
                    </div>
                    <Info size={20} className="text-slate-400" title="BMI has limitations and is used only as a general indicator." />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Daily Activity Level</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { level: 'Sedentary', desc: 'Little to no exercise, desk study' },
                        { level: 'Lightly Active', desc: 'Light walking between campus/hostel 1-3 days' },
                        { level: 'Moderately Active', desc: 'Gym / sports / brisk walk 3-5 days/week' },
                        { level: 'Very Active', desc: 'Heavy sports / daily intense workouts' }
                      ].map(item => (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => handleChange('activityLevel', item.level)}
                          className={`p-3.5 rounded-xl text-left border transition-all ${
                            formData.activityLevel === item.level
                              ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-bold text-slate-900 text-sm">{item.level}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Goal Selection */}
              {currentStep === 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 2: What is your primary nutrition goal?</h3>
                    <p className="text-sm text-slate-500">We will adjust calorie targets and macronutrient distributions accordingly.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { goal: 'Muscle gain', desc: 'Higher protein to support gym and strength progress', icon: <Dumbbell className="text-indigo-600" /> },
                      { goal: 'Fat loss', desc: 'Moderate calorie deficit with high satiety whole foods', icon: <Target className="text-emerald-600" /> },
                      { goal: 'Maintain weight', desc: 'Balanced energy to maintain current body composition', icon: <Activity className="text-teal-600" /> },
                      { goal: 'Improve energy for studies', desc: 'Focus on complex carbs and hydration to fight exam brain fog', icon: <Zap className="text-amber-500" /> },
                      { goal: 'Improve fitness', desc: 'Endurance, stamina, and cardiovascular wellness', icon: <Heart className="text-rose-500" /> },
                      { goal: 'General healthy eating', desc: 'Sustainable hostel habits avoiding junk food', icon: <Utensils className="text-blue-500" /> }
                    ].map(item => (
                      <button
                        key={item.goal}
                        type="button"
                        onClick={() => handleChange('goal', item.goal)}
                        className={`p-4 rounded-2xl text-left border flex items-start space-x-3.5 transition-all ${
                          formData.goal === item.goal
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-white shadow-sm border border-slate-100 shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{item.goal}</div>
                          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Dietary Preference */}
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 3: What is your dietary lifestyle?</h3>
                    <p className="text-sm text-slate-500">Ensures 100% compliant food recommendations without unwanted items.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { pref: 'Vegetarian', desc: 'Plant foods, grains, lentils, milk, curd, paneer (No meat/fish/egg)' },
                      { pref: 'Eggetarian', desc: 'Vegetarian diet + eggs (No chicken, meat, or fish)' },
                      { pref: 'Non-vegetarian', desc: 'Includes chicken, fish, eggs, along with vegetarian foods' },
                      { pref: 'Vegan', desc: 'Strictly plant-based (No dairy, eggs, honey, or animal products)' }
                    ].map(item => (
                      <button
                        key={item.pref}
                        type="button"
                        onClick={() => handleChange('dietaryPreference', item.pref)}
                        className={`p-4 rounded-2xl text-left border transition-all ${
                          formData.dietaryPreference === item.pref
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200 shadow-sm'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-slate-900 text-sm">{item.pref}</div>
                        <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Food Preferences & Allergies */}
              {currentStep === 4 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 4: Allergies & Taste Preferences</h3>
                    <p className="text-sm text-slate-500">Report any food allergies so they are strictly excluded from meal plans and product suggestions.</p>
                  </div>

                  {/* Common Allergens Tag Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Allergies / Intolerances</label>
                    <div className="flex flex-wrap gap-2">
                      {['None', 'Milk/Dairy', 'Peanuts', 'Tree Nuts', 'Gluten', 'Soy', 'Eggs'].map(allergen => {
                        const isSelected = formData.allergies.includes(allergen);
                        return (
                          <button
                            key={allergen}
                            type="button"
                            onClick={() => toggleAllergy(allergen)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {allergen}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Other Allergy (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.otherAllergies} 
                      onChange={(e) => handleChange('otherAllergies', e.target.value)}
                      placeholder="e.g. Shellfish, Sesame, Sulfites..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Favourite Foods (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.favouriteFoods} 
                        onChange={(e) => handleChange('favouriteFoods', e.target.value)}
                        placeholder="e.g. Apples, Bananas, Curd, Poha"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Disliked Foods (Optional)</label>
                      <input 
                        type="text" 
                        value={formData.dislikedFoods} 
                        onChange={(e) => handleChange('dislikedFoods', e.target.value)}
                        placeholder="e.g. Karela, Mushrooms, Spicy gravies"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Health Conditions */}
              {currentStep === 5 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 5: Voluntary Health Information</h3>
                    <p className="text-sm text-slate-500">If you have any diagnosed condition, the AI will provide condition-aware safety considerations (e.g. sodium or carbohydrate awareness).</p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {[
                      'No known medical condition',
                      'Diabetes / Pre-diabetes',
                      'High Blood Pressure',
                      'Thyroid condition',
                      'PCOS / PCOD',
                      'Gastric / Acidity issues',
                      'Anemia / Iron deficiency',
                      'High Cholesterol'
                    ].map(cond => {
                      const isSelected = formData.healthConditions.includes(cond);
                      return (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => toggleCondition(cond)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {cond}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Other Diagnosed Condition (Optional)</label>
                    <input 
                      type="text" 
                      value={formData.otherHealthConditions} 
                      onChange={(e) => handleChange('otherHealthConditions', e.target.value)}
                      placeholder="e.g. Lactose sensitivity, Kidney stones..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <strong>Note:</strong> Conditions are recorded as self-reported information to adapt general lifestyle guidance. The AI will never prescribe clinical treatments, calculate medical therapeutic diets, or advise stopping medications.
                  </div>
                </motion.div>
              )}

              {/* Step 6: Hostel Lifestyle & Budget */}
              {currentStep === 6 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Step 6: Your Hostel Lifestyle & Budget</h3>
                    <p className="text-sm text-slate-500">Fine-tune meal preparation options based on your mess routine and student budget.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Hostel Mess Availability</label>
                      <select 
                        value={formData.messAvailability} 
                        onChange={(e) => handleChange('messAvailability', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
                      >
                        <option value="full">Full Mess (Breakfast, Lunch & Dinner)</option>
                        <option value="partial">Partial Mess (Lunch & Dinner only)</option>
                        <option value="no_mess">No Mess (Self prep & outside food)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Monthly Food Budget</label>
                      <select 
                        value={formData.monthlyBudget} 
                        onChange={(e) => handleChange('monthlyBudget', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-sm"
                      >
                        <option value="Budget">Budget-Friendly (Affordable staples)</option>
                        <option value="Moderate">Moderate (Mess + fresh fruits & nuts)</option>
                        <option value="Flexible">Flexible (Comfortable spending)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Workout / Gym Schedule</label>
                      <input 
                        type="text" 
                        value={formData.workoutFrequency} 
                        onChange={(e) => handleChange('workoutFrequency', e.target.value)}
                        placeholder="e.g. Evening gym 4 days/week"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Typical Sleep Duration</label>
                      <input 
                        type="text" 
                        value={formData.sleepDuration} 
                        onChange={(e) => handleChange('sleepDuration', e.target.value)}
                        placeholder="e.g. 11:30 PM to 7:00 AM (7.5 hrs)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Wizard Navigation Footer Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                ) : <div />}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-md flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/30 flex items-center space-x-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Generating Diet Plan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Generate My AI Diet Plan ✨</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Previously Saved Plans Section in Wizard */}
            {savedPlans.length > 0 && (
              <div className="bg-slate-50/70 border-t border-slate-100 p-6 sm:p-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Saved Nutrition Plans</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {savedPlans.map(sp => (
                    <div
                      key={sp._id}
                      onClick={() => handleLoadPlan(sp._id)}
                      className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-emerald-500 cursor-pointer transition-all shadow-xs flex items-center justify-between group"
                    >
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">{sp.goal || 'Diet Plan'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(sp.createdAt).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={(e) => handleDeletePlan(sp._id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete saved plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* RESULT DASHBOARD VIEW */
          <div className="space-y-6">
            
            {/* Top Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setActivePlan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 flex items-center space-x-1.5"
              >
                <ChevronLeft size={16} />
                <span>Create New / Edit Profile</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium">Plan for:</span>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  {activePlan.profile?.goal} ({activePlan.profile?.dietaryPreference})
                </span>
              </div>
            </div>

            {/* Profile & Calorie Target Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Profile Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Screening Profile</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBmiCategory(activePlan.profile?.bmi).color}`}>
                    {activePlan.profile?.bmiCategory}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Height</div>
                    <div className="text-base font-black text-slate-800">{activePlan.profile?.height} cm</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Weight</div>
                    <div className="text-base font-black text-slate-800">{activePlan.profile?.weight} kg</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">BMI</div>
                    <div className="text-base font-black text-emerald-600">{activePlan.profile?.bmi}</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  <strong>Activity:</strong> {activePlan.profile?.activityLevel} • <strong>Age:</strong> {activePlan.profile?.age} yrs
                </div>
              </div>

              {/* Estimated Daily Targets */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-xs space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Target size={14} />
                    <span>Estimated Starting Targets</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Non-prescriptive</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-white">{activePlan.plan?.estimatedCalories || '2000 - 2200 kcal/day'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-700/60">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700/50">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Protein</div>
                    <div className="text-sm font-black text-emerald-300">{activePlan.plan?.estimatedMacros?.protein || '80-100g'}</div>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700/50">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Carbs</div>
                    <div className="text-sm font-black text-amber-300">{activePlan.plan?.estimatedMacros?.carbs || '240-280g'}</div>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl text-center border border-slate-700/50">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Fats</div>
                    <div className="text-sm font-black text-teal-300">{activePlan.plan?.estimatedMacros?.fats || '50-65g'}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Plan Summary Callout */}
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-sm leading-relaxed">
              <strong className="text-emerald-950">Plan Summary: </strong>
              {activePlan.plan?.summary}
            </div>

            {/* Dashboard Tabs Bar */}
            <div className="flex overflow-x-auto space-x-2 pb-1 border-b border-slate-200">
              {[
                { id: 'daily', label: 'Daily Meals', icon: <Clock size={16} /> },
                { id: 'weekly', label: '7-Day Weekly Plan', icon: <Calendar size={16} /> },
                { id: 'products', label: 'Recommended HostelKart Products', icon: <ShoppingCart size={16} /> },
                { id: 'foods', label: 'Foods & Hostel Tips', icon: <BookOpen size={16} /> },
                { id: 'chat', label: 'Ask AI / Substitutions', icon: <Sparkles size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center space-x-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: DAILY MEALS */}
            {activeTab === 'daily' && (
              <div className="space-y-4">
                {[
                  { key: 'earlyMorning', title: 'Early Morning', icon: <Sun size={18} className="text-amber-500" /> },
                  { key: 'breakfast', title: 'Breakfast', icon: <Coffee size={18} className="text-orange-500" /> },
                  { key: 'midMorning', title: 'Mid-Morning Snack', icon: <Zap size={18} className="text-amber-500" /> },
                  { key: 'lunch', title: 'Hostel Mess Lunch', icon: <Utensils size={18} className="text-emerald-500" /> },
                  { key: 'eveningSnack', title: 'Evening Study Snack', icon: <Coffee size={18} className="text-teal-500" /> },
                  { key: 'dinner', title: 'Hostel Mess Dinner', icon: <Utensils size={18} className="text-blue-500" /> },
                  { key: 'beforeBed', title: 'Before Bed', icon: <Moon size={18} className="text-indigo-500" /> }
                ].map(section => {
                  const items = activePlan.plan?.dailyPlan?.[section.key] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={section.key} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                      <div className="flex items-center space-x-2 font-bold text-slate-900 text-base mb-3">
                        {section.icon}
                        <span>{section.title}</span>
                      </div>
                      <div className="space-y-3">
                        {items.map((item, idx) => (
                          <div key={idx} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{item.time || 'Routine'}</span>
                            </div>
                            <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5 font-medium">
                              {(item.items || []).map((it, i) => (
                                <li key={i}>{it}</li>
                              ))}
                            </ul>
                            {item.hostelAlternative && (
                              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg mt-1">
                                <strong>Hostel Room / Mess Alt: </strong>{item.hostelAlternative}
                              </div>
                            )}
                            {item.reason && (
                              <div className="text-[11px] text-slate-500 italic">
                                💡 Why: {item.reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT 2: 7-DAY WEEKLY PLAN */}
            {activeTab === 'weekly' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">7-Day Hostel Meal Rotation Schedule</h3>
                  <span className="text-xs text-slate-500">Repeated meals allowed for practical hostel cooking</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(activePlan.plan?.weeklyPlan || []).map((dayPlan, idx) => (
                    <div key={idx} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="font-extrabold text-sm text-emerald-700 mb-2">{dayPlan.day}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-slate-500 block text-[10px] uppercase">Breakfast</strong>
                          <span className="text-slate-800">{dayPlan.breakfast}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-slate-500 block text-[10px] uppercase">Lunch</strong>
                          <span className="text-slate-800">{dayPlan.lunch}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-slate-500 block text-[10px] uppercase">Evening Snack</strong>
                          <span className="text-slate-800">{dayPlan.snack}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <strong className="text-slate-500 block text-[10px] uppercase">Dinner</strong>
                          <span className="text-slate-800">{dayPlan.dinner}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: RECOMMENDED HOSTELKART PRODUCTS */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">Available Products on HostelKart Catalog</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Order fresh fruits and hostel essentials delivered straight to your hostel floor corridor.</p>
                </div>

                {activePlan.plan?.recommendedProducts && activePlan.plan.recommendedProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {activePlan.plan.recommendedProducts.map(product => (
                      <div key={product._id} className="flex flex-col justify-between">
                        <ProductCard product={product} reason={product.reason} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-sm text-slate-500">
                    No immediate product links available for this specific filter.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: FOODS & HOSTEL TIPS */}
            {activeTab === 'foods' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Foods to Prefer */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-emerald-800 text-sm flex items-center space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Foods to Prefer</span>
                  </h3>
                  <div className="space-y-2">
                    {(activePlan.plan?.foodsToPrefer || []).map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                        <strong className="text-slate-900">{item.food}</strong>
                        <div className="text-slate-600 mt-0.5">{item.why}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Foods to Limit */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-rose-800 text-sm flex items-center space-x-2">
                    <AlertCircle size={16} className="text-rose-600" />
                    <span>Foods to Limit</span>
                  </h3>
                  <div className="space-y-2">
                    {(activePlan.plan?.foodsToLimit || []).map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs">
                        <strong className="text-slate-900">{item.food}</strong>
                        <div className="text-slate-600 mt-0.5">{item.why}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hydration Guidance */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-blue-800 text-sm flex items-center space-x-2">
                    <Droplets size={16} className="text-blue-600" />
                    <span>Hydration Target: {activePlan.plan?.hydration?.generalGuidance || '3.0 Liters/day'}</span>
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    {(activePlan.plan?.hydration?.tips || []).map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

                {/* Hostel Hacks */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center space-x-2">
                    <Sparkles size={16} className="text-amber-600" />
                    <span>Hostel Life Nutrition Tips</span>
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    {(activePlan.plan?.hostelTips || []).map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

            {/* TAB CONTENT 5: ASK AI / FOLLOW-UP CHAT */}
            {activeTab === 'chat' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[520px]">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                    <Sparkles size={16} className="text-emerald-600" />
                    <span>Smart Nutrition Assistant & Substitutions</span>
                  </h3>
                  <p className="text-xs text-slate-500">Ask questions about your plan, swap unavailable ingredients, or request budget adaptations.</p>
                </div>

                {/* Quick Substitution Chips */}
                <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-2 text-xs">
                  {[
                    'Can I replace banana with apple?',
                    'What should I eat before evening gym?',
                    'Give me a cheaper snack alternative',
                    'I only have mess food for lunch and dinner'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(chip)}
                      className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors text-[11px] font-medium"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-slate-100 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatSending && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-500 p-3 rounded-2xl text-xs flex items-center space-x-2">
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                  className="p-3 bg-slate-50 border-t border-slate-100 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about substitutions or meals..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={isChatSending || !chatInput.trim()}
                    className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* Bottom Disclaimer */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-[11px] leading-relaxed">
              <strong>Disclaimer: </strong> {activePlan.plan?.disclaimer}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default DietPlanner;

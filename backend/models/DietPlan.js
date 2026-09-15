import mongoose from 'mongoose';

const dietPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    profileSnapshot: {
      age: { type: Number, required: true },
      gender: { type: String, default: 'unspecified' },
      height: { type: Number, required: true }, // in cm
      weight: { type: Number, required: true }, // in kg
      bmi: { type: Number, required: true },
      bmiCategory: { type: String, required: true },
      activityLevel: { type: String, required: true },
      goal: { type: String, required: true },
      dietaryPreference: { type: String, required: true },
      foodPreferences: {
        favouriteFoods: { type: String, default: '' },
        dislikedFoods: { type: String, default: '' },
        inaccessibleFoods: { type: String, default: '' },
      },
      allergies: [{ type: String }],
      otherAllergies: { type: String, default: '' },
      healthConditions: [{ type: String }],
      otherHealthConditions: { type: String, default: '' },
      hostelLifestyle: {
        sleepDuration: { type: String, default: '' },
        workoutFrequency: { type: String, default: '' },
        dailyWaterIntake: { type: String, default: '' },
        mealTimings: { type: String, default: '' },
        messAvailability: { type: String, default: 'full' },
        monthlyBudget: { type: String, default: 'Moderate' },
      },
    },
    plan: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

export default DietPlan;

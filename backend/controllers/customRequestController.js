import asyncHandler from 'express-async-handler';
import CustomRequest from '../models/CustomRequest.js';

// @desc    Create new custom request
// @route   POST /api/custom-requests
// @access  Private/Student
const createCustomRequest = asyncHandler(async (req, res) => {
  const { itemName, description, estimatedPrice } = req.body;

  if (!itemName || !description) {
    res.status(400);
    throw new Error('Please fill all required fields');
  }

  const customRequest = await CustomRequest.create({
    user: req.user._id,
    itemName,
    description,
    estimatedPrice: Number(estimatedPrice) || 0,
  });

  res.status(201).json(customRequest);
});

// @desc    Get logged in student's custom requests
// @route   GET /api/custom-requests/myrequests
// @access  Private/Student
const getMyCustomRequests = asyncHandler(async (req, res) => {
  const requests = await CustomRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(requests);
});

export { createCustomRequest, getMyCustomRequests };

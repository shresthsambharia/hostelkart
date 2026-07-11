import asyncHandler from 'express-async-handler';
import CustomRequest from '../models/CustomRequest.js';

// @desc    Create new custom request
// @route   POST /api/custom-requests
// @access  Private/Student
const createCustomRequest = asyncHandler(async (req, res) => {
  const { itemName, description, estimatedPrice } = req.body;

  if (!itemName || !itemName.trim() || !description || !description.trim()) {
    res.status(400);
    throw new Error('Item name and description are required');
  }

  const priceNum = Number(estimatedPrice || 0);
  if (isNaN(priceNum) || priceNum < 0) {
    res.status(400);
    throw new Error('Estimated price must be a valid non-negative number');
  }

  const customRequest = await CustomRequest.create({
    user: req.user._id,
    itemName: itemName.trim(),
    description: description.trim(),
    estimatedPrice: priceNum,
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

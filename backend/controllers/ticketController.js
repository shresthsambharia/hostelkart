import asyncHandler from 'express-async-handler';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { createAlert } from './notificationController.js';

// @desc    Create a new support ticket
// @route   POST /api/tickets
// @access  Private/Student
export const createTicket = asyncHandler(async (req, res) => {
  const { orderId, category, subject, description, attachments } = req.body;

  if (!category || !subject || !description) {
    res.status(400);
    throw new Error('Category, subject and description are required');
  }

  // Automatic Priority Calculation
  let priority = 'Low';
  if (category === 'Payment Issue' || category === 'Refund') {
    priority = 'High';
  } else if (category === 'Wrong Product' || category === 'Missing Item' || category === 'Order Issue') {
    priority = 'Urgent';
  } else if (category === 'Delivery') {
    priority = 'Medium';
  }

  const ticket = await SupportTicket.create({
    customer: req.user._id,
    order: orderId || undefined,
    category,
    priority,
    subject,
    description,
    messages: [{
      sender: req.user._id,
      content: description,
      attachments: attachments || []
    }]
  });

  // Notify admins via Socket/In-app
  const admins = await User.find({ role: 'admin' });
  for (const admin of admins) {
    await createAlert(
      admin._id,
      'New Support Ticket Created',
      `Ticket ${ticket.ticketId} has been created under category ${category}.`,
      'Support',
      `/admin/support`
    );
  }

  res.status(201).json(ticket);
});

// @desc    Get tickets for logged-in customer
// @route   GET /api/tickets
// @access  Private/Student
export const getTickets = asyncHandler(async (req, res) => {
  const { status, category, keyword } = req.query;
  const filter = { customer: req.user._id };

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (keyword) {
    filter.$or = [
      { subject: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { ticketId: { $regex: keyword, $options: 'i' } }
    ];
  }

  const tickets = await SupportTicket.find(filter)
    .populate('assignedAdmin', 'name email')
    .sort({ updatedAt: -1 })
    .lean();

  res.json(tickets);
});

// @desc    Get ticket by ID
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .populate('messages.sender', 'name email role');

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  // Authorize check: Customer who created it or Admin
  if (ticket.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this ticket');
  }

  res.json(ticket);
});

// @desc    Add a message/reply to a ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
export const addMessage = asyncHandler(async (req, res) => {
  const { content, attachments, isInternalNote } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  // Authorize check
  if (ticket.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to reply to this ticket');
  }

  const message = {
    sender: req.user._id,
    content,
    attachments: attachments || [],
    isInternalNote: req.user.role === 'admin' ? !!isInternalNote : false
  };

  ticket.messages.push(message);

  // Update Status
  if (req.user.role === 'admin') {
    if (!isInternalNote) {
      ticket.status = 'Pending Customer';
    }
  } else {
    ticket.status = 'Open';
  }

  ticket.updatedAt = Date.now();
  await ticket.save();

  // Socket notification or Alert
  if (req.user.role === 'admin' && !isInternalNote) {
    await createAlert(
      ticket.customer,
      'Support Ticket Reply',
      `An administrator has replied to support ticket ${ticket.ticketId}.`,
      'Support',
      `/support`
    );
  } else if (req.user.role === 'student' && ticket.assignedAdmin) {
    await createAlert(
      ticket.assignedAdmin,
      'Customer Support Ticket Reply',
      `Customer Rohan replied to ticket ${ticket.ticketId}.`,
      'Support',
      `/admin/support`
    );
  }

  // Retrieve populated message
  const populatedTicket = await SupportTicket.findById(ticket._id)
    .populate('messages.sender', 'name email role');
  
  const addedMsg = populatedTicket.messages[populatedTicket.messages.length - 1];

  // Broadcast Socket Event
  const io = req.app.get('io');
  if (io) {
    io.to(ticket._id.toString()).emit('new_ticket_message', addedMsg);
  }

  res.status(201).json(addedMsg);
});

// @desc    Close a support ticket
// @route   PUT /api/tickets/:id/close
// @access  Private
export const closeTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (ticket.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized');
  }

  ticket.status = 'Closed';
  ticket.closedAt = Date.now();
  await ticket.save();

  await createAlert(
    ticket.customer,
    'Support Ticket Closed',
    `Support ticket ${ticket.ticketId} has been marked as Closed.`,
    'Support',
    `/support`
  );

  res.json({ message: 'Ticket closed successfully', ticket });
});

// @desc    Submit rating feedback on a resolved/closed ticket
// @route   PUT /api/tickets/:id/rate
// @access  Private/Student
export const rateTicket = asyncHandler(async (req, res) => {
  const { stars, feedback } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (ticket.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }

  ticket.rating = {
    stars: Number(stars),
    feedback
  };

  await ticket.save();
  res.json({ message: 'Feedback submitted successfully', ticket });
});

// @desc    Get all tickets (Admin Support Panel)
// @route   GET /api/tickets/admin
// @access  Private/Admin
export const adminGetTickets = asyncHandler(async (req, res) => {
  const { status, priority, category, assignedAdmin, keyword } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (assignedAdmin) filter.assignedAdmin = assignedAdmin;
  if (keyword) {
    filter.$or = [
      { subject: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } },
      { ticketId: { $regex: keyword, $options: 'i' } }
    ];
  }

  const tickets = await SupportTicket.find(filter)
    .populate('customer', 'name email')
    .populate('assignedAdmin', 'name email')
    .sort({ updatedAt: -1 })
    .lean();

  res.json(tickets);
});

// @desc    Update support ticket details (Admin)
// @route   PUT /api/tickets/admin/:id
// @access  Private/Admin
export const adminUpdateTicket = asyncHandler(async (req, res) => {
  const { priority, status, assignedAdmin } = req.body;
  const ticket = await SupportTicket.findById(req.params.id);

  if (!ticket) {
    res.status(404);
    throw new Error('Ticket not found');
  }

  if (priority) ticket.priority = priority;
  if (status) ticket.status = status;
  if (assignedAdmin !== undefined) {
    ticket.assignedAdmin = assignedAdmin || undefined;
  }

  await ticket.save();

  if (assignedAdmin) {
    await createAlert(
      assignedAdmin,
      'Support Ticket Assigned',
      `You have been assigned to support ticket ${ticket.ticketId}.`,
      'Support',
      `/admin/support`
    );
  }

  res.json(ticket);
});

// @desc    Get support ticket analytics dashboard metrics (Admin)
// @route   GET /api/tickets/admin/analytics
// @access  Private/Admin
export const adminGetAnalytics = asyncHandler(async (req, res) => {
  const openCount = await SupportTicket.countDocuments({ status: { $ne: 'Closed' } });
  const closedCount = await SupportTicket.countDocuments({ status: 'Closed' });

  const categories = await SupportTicket.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const priorities = await SupportTicket.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);

  res.json({
    openCount,
    closedCount,
    categories,
    priorities
  });
});

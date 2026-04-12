const User = require('../models/User');
const normalizeRole = (role) => (role === 'user' ? 'staff' : role);

// Helper to send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role)
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: 'staff'
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // If portal role is specified, validate it matches the user's actual role
    if (expectedRole) {
      const actualRole = normalizeRole(user.role);
      if (actualRole !== expectedRole) {
        const portalLabel = actualRole === 'admin' ? 'Admin Portal' : 'Staff Portal';
        return res.status(403).json({
          success: false,
          error: `This account belongs to the ${portalLabel}. Please sign in from the correct portal.`
        });
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        role: normalizeRole(user.role),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get all users for role management
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users.map((user) => ({
        ...user.toObject(),
        role: normalizeRole(user.role),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Update a user's role
// @route   PUT /api/auth/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const requestedRole = normalizeRole(req.body?.role || 'staff');

    if (!['staff', 'admin'].includes(requestedRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role supplied' });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const currentRole = normalizeRole(targetUser.role);

    if (currentRole === requestedRole) {
      return res.status(200).json({
        success: true,
        data: {
          ...targetUser.toObject(),
          role: currentRole,
        },
      });
    }

    if (String(targetUser._id) === String(req.user.id) && requestedRole !== 'admin') {
      return res.status(400).json({ success: false, error: 'You cannot remove your own admin access' });
    }

    if (currentRole === 'admin' && requestedRole === 'staff') {
      const adminCount = await User.countDocuments({ role: { $in: ['admin'] } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'At least one admin account must remain in the workspace',
        });
      }
    }

    targetUser.role = requestedRole;
    await targetUser.save();

    res.status(200).json({
      success: true,
      data: {
        ...targetUser.toObject(),
        role: normalizeRole(targetUser.role),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

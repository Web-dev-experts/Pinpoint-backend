const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const formatUser = {
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };

  res.status(200).json({
    status: 'success',
    data: {
      user: formatUser,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;

  if (req.body.password)
    return next(new AppError('You cannot change password in this URL!', 401));

  const user = await User.findOneAndUpdate(
    { email: req.user.email },
    { email, name },
    { runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { active: false },
    {
      runValidators: false,
    }
  );

  res.status(204).json({
    status: 'success',
  });
});

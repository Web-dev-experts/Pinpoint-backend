require('dotenv').config({ path: '../config.env' });
const AppError = require('../utils/AppError');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { promisify } = require('util');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const signToken = function (_id) {
  const token = jwt.sign({ _id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_AT,
  });

  return token;
};

const createSendToken = function (user, statusCode, res) {
  const token = signToken(user._id);

  const cookieOption = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 3600000,
  };

  console.log(token);

  res.cookie('jwt', token, cookieOption);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
  });

  res.status(201).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('You must enter an email & a password!', 400));
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password, user.password)))
    return next(new AppError('Email or password is incorect!', 400));

  createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: 'false',
    sameSite: 'none',
    maxAge: 0,
  });

  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.cookie && req.headers.cookie.startsWith('jwt=')) {
    token = req.headers.cookie.replace('jwt=', '');
  }

  if (!jwt.verify(token, process.env.JWT_SECRET))
    return next(new AppError('You are not logged in! Please login', 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded._id);

  if (!user)
    return next(
      new AppError('The user belonging to this token no longer exists!', 401),
    );

  if (!user.passwordChangedAfter(decoded.iat))
    return next(
      new AppError('The user has changed password! Please log in again', 401),
    );

  req.user = user;
  next();
});

exports.restrictTo =
  (...roles) =>
  async (req, res, next) => {
    const user = req.user;
    if (!roles.includes(user.role))
      return next(
        new AppError('You do not have permission to perform this act!', 403),
      );

    next();
  };

exports.forgetPassword = catchAsync(async function (req, res, next) {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) return next(new AppError('There is no user with that email', 400));

  const resetToken = await user.createResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    const html = fs
      .readFileSync(path.join(__dirname, '../utils/email.html'), 'utf-8')
      .replace(
        '{{ACTION_URL}}',
        `${resetToken}`,
      );

    await resend.emails.send({
      from: process.env.PROD_EMAIL,
      to:
        process.env.NODE_ENV === 'production'
          ? user.email
          : 'itworksonmymachinedev@gmail.com',
      subject: 'Your password reset token!',
      html,
    });

    res.status(200).json({
      status: 'success',
      message: 'Email sent!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email! Please try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async function (req, res, next) {
  const { password, confirmPassword } = req.body;
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  if (!password || !confirmPassword)
    return next(
      new AppError('You must enter a password & its confirmation!', 400),
    );

  const user = await User.findOne({ passwordResetToken: hashedToken });

  if (!user) return next(new AppError('Token is invalid or has expired!', 401));

  user.password = password;
  user.confirmPassword = confirmPassword;
  user.passwordResetExpires = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date(Date.now()).toISOString();
  await user.save();

  createSendToken(user, 200, res);
});

exports.updateRole = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.newRole },
    { runValidators: false },
  );

  if (!user) return next(new AppError('This user does not exist!', 404));

  res.status(200).json({
    status: 'success',
  });
});

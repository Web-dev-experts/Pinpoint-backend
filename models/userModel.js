const { model, Schema } = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');
const crypto = require('node:crypto');

const userSchema = new Schema({
  name: { type: String, required: [true, 'The user must have a name!'] },
  email: {
    type: String,
    required: [true, 'The user must have an email!'],
    validate: {
      validator: function (v) {
        return isEmail(v);
      },
      message: `${this.email} is not a valid email!`,
    },
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'The user must have an email!'],
    minLength: [8, 'Password must be more than 8 characters'],
    select: false,
  },
  confirmPassword: {
    type: String,
    validate: {
      validator: function (v) {
        return v === this.password;
      },
      message: 'Passwords do not match',
    },
    required: [true, 'The user must have an email!'],
    minLength: [8, 'Password must be more than 8 characters'],
    select: false,
  },
  passwordChangedAt: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  createdAt: { type: Date, default: new Date(Date.now()).toISOString() },
  role: { type: String, default: 'user', enum: ['admin', 'user'] },
  active: { type: Boolean, default: true },
});

userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const hashedPassword = await bcrypt.hash(this.password, 12);

  this.password = hashedPassword;
  this.confirmPassword = undefined;

  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.comparePassword = async function (
  candidatePassword,
  actualPassword,
) {
  return bcrypt.compare(candidatePassword, actualPassword);
};

userSchema.methods.passwordChangedAfter = async function (initialDate) {
  return this.passwordChangedAt > initialDate;
};

userSchema.methods.createResetToken = async function () {
  const hash = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(hash)
    .digest('hex');

  this.passwordResetExpires = new Date(
    Date.now() + 1000 * 60 * 100,
  ).toISOString();

  return hash;
};

const User = model('User', userSchema);

module.exports = User;

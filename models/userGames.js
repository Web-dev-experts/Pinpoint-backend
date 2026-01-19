const { model, Schema } = require('mongoose');
const mongoose = require('mongoose');

function calculateXP(distance, timeLeft) {
  if (distance <= 0) return 0;
  const distanceKm = distance / 1000;

  const baseXP = 200 * (1 - Math.min(distanceKm / 10000, 1));

  const timeFactor = (Math.sqrt(timeLeft || 1) + 1) / (Math.sqrt(200) + 1);

  return Math.round(baseXP / timeFactor);
}

const userGameSchema = new Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  guess: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  timeLeft: { type: Number },
  distance: Number,
  xp: Number,
  isFinished: Boolean,
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
});

userGameSchema.pre('save', async function () {
  console.log(this);

  if (this.guess.coordinates === undefined || !this.guess.coordinates) return;

  const [guessLng, guessLat] = this.guess.coordinates;
  const [locLng, locLat] = this.location.coordinates;

  const R = 6371000; // meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(locLat - guessLat);
  const dLng = toRad(locLng - guessLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(guessLat)) *
      Math.cos(toRad(locLat)) *
      Math.sin(dLng / 2) ** 2;

  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  this.distance = Math.round(distance);

  this.xp = calculateXP(this.distance, this.timeLeft);
});

userGameSchema.index({ location: '2dsphere' });
userGameSchema.index({ guess: '2dsphere' });

const UserGame = model('UserGame', userGameSchema);
module.exports = UserGame;

const AppError = require('../utils/AppError');
const UserGame = require('../models/userGames');
const catchAsync = require('../utils/catchAsync');

exports.play = catchAsync(async (req, res, next) => {
  const { location } = req.body;

  if (!location)
    return next(new AppError('There is no innitial location in the game', 400));

  if (
    location.type !== 'Point' ||
    !location?.coordinates ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    return next(new AppError('Location format isnt valid!', 401));
  }

  let game = await UserGame.findOne({ user: req.user._id });
  let statusCode;

  console.log(!game);

  if (!game || game.isFinished) {
    await UserGame.deleteMany();
    game = await UserGame.create({
      location,
      timeLeft: 120,
      user: req.user._id,
    });
    statusCode = 201;
  }
  res.status(statusCode || 200).json({
    status: 'success',
    data: {
      game,
    },
  });
});

exports.guess = catchAsync(async (req, res, next) => {
  const { guess, timeLeft } = req.body;
  if (
    guess.type !== 'Point' ||
    !guess?.coordinates ||
    !Array.isArray(guess.coordinates) ||
    guess.coordinates.length !== 2
  )
    return next(new AppError('Guess format isnt valid!', 401));

  if (typeof timeLeft === 'string') timeLeft = Number(timeLeft);

  const game = await UserGame.findOne(
    { user: req.user._id },
  );
  game.guess = guess;
  game.timeLeft = timeLeft;
  game.isFinished = true;

  await game.save();

  res.status(200).json({
    status: 'success',
    data: {
      game,
    },
  });
});

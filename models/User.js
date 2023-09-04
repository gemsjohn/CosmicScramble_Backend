const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const Game = require('./Game').schema;
const SavedGame = require('./SavedGame').schema;
const ToBeContinued = require('./ToBeContinued').schema;


const userSchema = new Schema(
  {
    role: {
      type: [String],
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+@.+\..+/, 'Must use a valid email address'],
    },
    profilepicture: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    games: [Game],
    resetToken: {
      type: String,
    },
    saved: SavedGame,
    maxstage: {
      type: String,
    },
    tobecontinued: ToBeContinued,
    highscore: {
      type: String,
    },
    tokens: {
      type: String
    },
    resetTokenExpiry: {
      type: String,
    },
    currentVersion: {
      type: String,
      default: '1.2.6'
    }
  },
  
  // set this to use virtual below
  {
    toJSON: {
      virtuals: true,
    },
  }
);

// hash user password
userSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('password')) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  next();
});

// custom method to compare and validate password for logging in
userSchema.methods.isCorrectPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};


// when we query a user, we'll also get another field called `bookCount` with the number of saved books we have
// userSchema.virtual('bookCount').get(function () {
//   return this.savedBooks.length;
// });

const User = model('User', userSchema);

module.exports = User;

const { Schema, model } = require('mongoose');

const GameSchema = new Schema(
  {
    userid: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    score: {
      type: String,
      required: true,
    },
    stage: {
      type: String,
    },
    date: {
      type: String,
    },
    
  },
  
  {
    toJSON: {
      virtuals: true,
    },
  }
);

const Game = model('Game', GameSchema);

module.exports = Game;

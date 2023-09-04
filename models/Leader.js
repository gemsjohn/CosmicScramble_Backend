const { Schema, model } = require('mongoose');

const LeaderSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    score: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true
    }
  },
  
  // set this to use virtual below
  {
    toJSON: {
      virtuals: true,
    },
  }
);

const Leader = model('Leader', LeaderSchema);

module.exports = Leader;

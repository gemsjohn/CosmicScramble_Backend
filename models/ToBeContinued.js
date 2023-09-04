const { Schema, model } = require('mongoose');


const ToBeContinuedSchema = new Schema(
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
  
  // set this to use virtual below
  {
    toJSON: {
      virtuals: true,
    },
  }
);


const ToBeContinued = model('ToBeContinued', ToBeContinuedSchema);

module.exports = ToBeContinued;

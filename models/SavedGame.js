const { Schema, model } = require('mongoose');


const SavedGameSchema = new Schema(
    {
        userid: {
            type: String,
        },
        stage: {
            type: String,
        },
        score: {
            type: String,
        },
        level: {
            type: String,
        },
        crashes: {
            type: String,
        },
        letterPocket: {
            type: String,
        },
        displayLetters: {
            type: String,
        },
        currentLetterCountValue: {
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


const SavedGame = model('SavedGame', SavedGameSchema);

module.exports = SavedGame;

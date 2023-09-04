require('dotenv').config();
const { ApolloError } = require('apollo-server-errors');
const { AuthenticationError } = require('apollo-server-express');
const { User, Game, SavedGame, ToBeContinued } = require("../models");
const { signToken, clearToken } = require('../utils/auth');
const bcrypt = require('bcrypt');
const moment = require('moment');
const axios = require('axios');
const { promisify } = require("es6-promisify");
const randomBytes = require('randombytes');
const nodemailer = require("nodemailer");
const Sequelize = require('sequelize');
// const InitialEmail = require('../InitialEmail')
const GenerateCryptoRandomString = require('../CryptoRandomString');

const urlEndpoint = `${process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT}`;

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select('-__v -password')
        return userData;
      }
      // throw new AuthenticationError('Not logged in');
    },
    // users
    users: async (parent, args, context) => {
      const saltRounds = 10;
      const hash = await bcrypt.hash(args.echo, saltRounds);

      if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
        if (context.user.role[0] === 'Admin') {
          return User.find()
        }
      } else {
        return null;
      }


    },
    // single user by username
    user: async (parent, args, context) => {
      if (context.user._id === args._id || context.user.role[0] === 'Admin') {
        return User.findOne({ _id: args._id })
      }
    },
    getUsers: async (parent, args, context) => {
      const { search } = args;
      let searchQuery = {};

      const saltRounds = 10;
      const hash = await bcrypt.hash(args.echo, saltRounds);

      if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
        if (context.user.role[0] === 'Admin') {
          if (search) {
            searchQuery = {
              $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
              ],
            };
          }

          const users = await User.find(searchQuery);

          return {
            users,
          };
        }
      } else {
        return null;
      }
    },
    games: async (parent, args, context) => {
      let games = await Game.find();
      games.sort((a, b) => parseInt(b.score) - parseInt(a.score));
      return games;
    },
    // games: async (parent, args, context) => {
    //   try {
    //     const saltRounds = 10;
    //     const hash = await bcrypt.hash(args.echo, saltRounds);

    //     if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
    //       if (context.user.role[0] === 'Admin') {
    //         let games = await Game.find();
    //         games.sort((a, b) => parseInt(b.score) - parseInt(a.score));
    //         return games;
    //       }
    //     } else {
    //       return null;
    //     }
    //   } catch (err) {
    //     throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
    //   }

    //   // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    // },

    // single user by username
    game: async (parent, { _id }) => {
      return Game.findOne({ _id })
    },
    saved: async (parent, args, context) => {
      try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(args.echo, saltRounds);

        if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
          if (context.user.role[0] === 'Admin') {
            let saved = await SavedGame.find();
            return saved;
          }
        } else {
          return null;
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    // leaderBoard: async () => {

    //   let LBArray = [];
    //   let scoreSum = 0;

    //   const cutoff = new moment().subtract(30, 'days').calendar();

    //   const Game_0 = await Game.find({ date: { $gte: cutoff } });

    //   const combinedEntries = {};
    //   for (const entry of Game_0) {
    //     if (!(entry.username in combinedEntries)) {
    //       combinedEntries[entry.username] = { username: entry.username, score: 0 };
    //     }
    //     combinedEntries[entry.username].score += parseInt(entry.score);
    //   }

    //   // Sort the combined entries by score in descending order
    //   const sortedEntries = Object.values(combinedEntries);
    //   sortedEntries.sort((a, b) => b.score - a.score);

    //   // Build the leaderboard string
    //   for (const [i, entry] of sortedEntries.entries()) {
    //     LBArray.push({ "username": entry.username, "score": entry.score, id: i, position: i + 1 })
    //   }

    //   return LBArray;

    // },
  },

  Mutation: {
    login: async (parent, { username, password, role }) => {
      console.log("LOGIN")
      let lowerCaseUsername = username.toLowerCase();
      const user = await User.findOne({ username: lowerCaseUsername.replace(/\s/g, '') });
      const permission = await User.find({ role });

      if (!user) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      const token = signToken(user);
      return { token, user, permission };
    },
    addUser: async (parent, args) => {
      console.log("ADD USER")
      let lowerCaseUsername = args.username.toLowerCase();
      let upperCaseUsername = args.username.toUpperCase();
      let lowerCaseEmail = args.email.toLowerCase();
      let filteredUsername = lowerCaseUsername.replace(/\s+/g, '');
      let filteredUsernameUpper = upperCaseUsername.replace(/\s+/g, '');
      let filteredEmail = lowerCaseEmail.replace(/\s+/g, '');
      let now = moment();

      const user = await User.create(
        {
          role: 'User',
          email: filteredEmail,
          username: filteredUsername,
          password: args.password,
          tokens: 5,
          highscore: 0,
          maxstage: 0
        }
      );

      const game = await Game.create(
        {
          username: filteredUsernameUpper,
          userid: user._id,
          score: 0,
          stage: 0,
          date: now,
        }
      );

      await ToBeContinued.create(
        {
          username: lowerCaseUsername,
          userid: user._id,
          score: 0,
          stage: 0,
          date: now,
        }
      );

      const token = signToken(user);

      // InitialEmail(args.username, lowerCaseEmail);

      return { token, user };
    },
    updateUser: async (parents, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        console.log(args)
        let lowerCaseUsername = args.username.toLowerCase();
        let prevUpperCaseUsername = args.prevusername.toUpperCase();
        let upperCaseUsername = args.username.toUpperCase();
        let lowerCaseEmail = args.email.toLowerCase();
        let filteredUsername = lowerCaseUsername.replace(/\s+/g, '');
        let prevFilteredUsername_Uppercase = prevUpperCaseUsername.replace(/\s+/g, '');
        let filteredUsername_Uppercase = upperCaseUsername.replace(/\s+/g, '');
        let filteredEmail = lowerCaseEmail.replace(/\s+/g, '');
        if (context.user) {
          await User.findByIdAndUpdate(
            { _id: context.user._id },
            {
              role: context.user.role,
              username: filteredUsername,
              email: filteredEmail,
            },
            { new: true }
          )

          await Game.findOneAndUpdate(
            { username: prevFilteredUsername_Uppercase },
            {
              username: filteredUsername_Uppercase
            },
            { new: true }
          )
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    updateMaxScoreAndStage: async (parents, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        console.log("updateMaxScoreAndStage")
        let upperCaseUsername = user.username.toUpperCase();
        let now = moment();

        if (parseInt(args.maxstage) > parseInt(user.maxstage)) {
          await User.findByIdAndUpdate(
            { _id: context.user._id },
            {
              maxstage: args.maxstage,
            },
            { new: true }
          )
        }

        if (parseInt(args.highscore) > parseInt(user.highscore)) {
          await User.findByIdAndUpdate(
            { _id: context.user._id },
            {
              highscore: args.highscore
            },
            { new: true }
          )
          const game = await Game.findOne({ userid: user._id })
          await Game.findByIdAndUpdate(
            { _id: game._id },
            {
              score: args.highscore,
              stage: args.maxstage
            }
          )
        }


      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    updateTokenCount: async (parents, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }
        console.log("#1")

        const user = await User.findById({ _id: args.userid })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        console.log("#2")


        if (args.remove === "true" && user.tokens <= 0) {
          throw new ApolloError('Insufficient tokens', 'INSUFFICIENT_TOKENS')
        }
        console.log("#3")

        const amount = Number(args.amount)
        console.log(amount)
        if (isNaN(amount) || amount < 0) {
          throw new ApolloError('Invalid amount provided', 'INVALID_INPUT')
        }
        console.log("#4")


        if (args.add !== "true" && args.add !== "false") {
          throw new ApolloError('Invalid add argument provided', 'INVALID_INPUT')
        }
        console.log("#5")


        if (args.remove !== "true" && args.remove !== "false") {
          throw new ApolloError('Invalid remove argument provided', 'INVALID_INPUT')
        }
        console.log("#6")

        console.log("updateTokenCount")
        if (user.tokens > 0 && args.remove == "true") {
        console.log("#8")

          await User.findByIdAndUpdate(
            { _id: args.userid },
            {
              tokens: user.tokens - 1
            },
            { new: true }
          )
        }
        if (args.add == "true" && Number(args.amount) > 0) {
        console.log("#9")

          const updateTokens = Number(user.tokens) + Number(args.amount);
          console.log(args.add)
          await User.findByIdAndUpdate(
            { _id: args.userid },
            {
              tokens: updateTokens
            },
            { new: true }
          )
        }

      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    updateUserPassword: async (parent, { password }, context) => {
      console.log(context.user)
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);
        if (context.user) {
          const result = await User.findByIdAndUpdate(
            { _id: context.user._id },
            {
              password: hash,
              resetToken: null,
              resetTokenExpiry: null
            },
            {
              where: { _id: context.user._id },
              returning: true,
              plain: true
            }
          );
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    addGame: async (parent, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        if (context.user._id === args.userid) {
          console.log("ADD GAME")
          let lowerCaseUsername = args.username.toLowerCase();
          let now = moment();
          const game = await Game.create(
            {
              username: lowerCaseUsername,
              userid: args.userid,
              score: args.score,
              stage: args.stage,
              date: now,
            }
          );
          console.log(game)
          const user = await User.updateOne(
            { _id: game.userid },
            {
              $addToSet: {
                games: {
                  _id: game._id,
                  username: lowerCaseUsername,
                  userid: args.userid,
                  score: args.score,
                  stage: args.stage,
                  date: now,
                }
              }
            },
            { new: true }


          );
          console.log(user)

          return { game };
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    addSavedGame: async (parent, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        if (context.user) {
          let now = moment();
          const saved = await SavedGame.findOne({ userid: args.userid })
          console.log(saved)
          if (saved) {
            console.log("#1")
            await SavedGame.findOneAndUpdate(
              { userid: args.userid },
              {
                userid: args.userid,
                stage: args.stage,
                score: args.score,
                level: args.level,
                crashes: args.crashes,
                letterPocket: args.letterPocket,
                displayLetters: args.displayLetters,
                currentLetterCountValue: args.currentLetterCountValue,
                date: now
              },
              { new: true }
            )
          } else {
            console.log("#2")
            const saved = await SavedGame.create(
              { _id: context.user._id },
              {
                userid: args.userid,
                stage: args.stage,
                score: args.score,
                level: args.level,
                crashes: args.crashes,
                letterPocket: args.letterPocket,
                displayLetters: args.displayLetters,
                currentLetterCountValue: args.currentLetterCountValue,
                date: now
              },
              { new: true }
            )
          }


          await User.findByIdAndUpdate(
            { _id: context.user._id },
            {
              // $addToSet: {
              saved: {
                userid: args.userid,
                stage: args.stage,
                score: args.score,
                level: args.level,
                crashes: args.crashes,
                letterPocket: args.letterPocket,
                displayLetters: args.displayLetters,
                currentLetterCountValue: args.currentLetterCountValue,
                date: now
              }
              // }
            },
            { new: true }


          );

        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    addToBeContinued: async (parent, args, context) => {
      
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        if (context.user._id === args.userid) {
          console.log("addToBeContinued")
          let lowerCaseUsername = args.username.toLowerCase();
          let now = moment();

          const tbc = await ToBeContinued.findOne(
            { userid: context.user._id }
          );

          if (tbc.score <= args.score) {
            console.log("UPDATE")
            await ToBeContinued.findOneAndUpdate(
              { userid: context.user._id },
              {
                username: lowerCaseUsername,
                userid: args.userid,
                score: args.score,
                stage: args.stage,
                date: now,
              },
              { new: true }
            );

            await User.findByIdAndUpdate(
              { _id: context.user._id },
              {
                tobecontinued: {
                  username: lowerCaseUsername,
                  userid: args.userid,
                  score: args.score,
                  stage: args.stage,
                  date: now,
                }
              },
              { new: true }
  
  
            );

          }
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
    },
    deleteSavedGame: async (parent, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        const saltRounds = 10;
        const hash = await bcrypt.hash(args.echo, saltRounds);

        if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
          if (context.user.role[0] === 'Admin') {
            console.log(args.id)
            const saved = await SavedGame.findOne({ _id: args.id })
            // await User.updateOne(
            //   { _id: game.userid },
            //   { $pull: { games: { _id: args.id } } },
            // )
            await SavedGame.findByIdAndDelete({ _id: args.id })
          }
        } else {
          return null;
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')

    },

    deleteGame: async (parent, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }
        const saltRounds = 10;
        const hash = await bcrypt.hash(args.echo, saltRounds);

        if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
          if (context.user.role[0] === 'Admin') {
            const game = await Game.findOne({ _id: args.id })
            console.log(game)
            await User.updateOne(
              { _id: game.userid },
              { $pull: { games: { _id: args.id } } },
            )
            await Game.findByIdAndDelete({ _id: args.id })
          }
        } else {
          return null;
        }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')

    },
    requestReset: async (parent, args, context) => {
      console.log("requestReset")
      console.log(args)
      let lowerCaseEmail = args.email.toLowerCase();
      console.log(lowerCaseEmail)
      const username = `${process.env.SMTP_USERNAME}`
      const password = `${process.env.SMTP_PASSWORD}`
      const user = await User.findOne(
        { email: lowerCaseEmail }
      )
      console.log(user)

      if (!user) throw new Error("No user found with that email.");

      // Create randomBytes that will be used as a token
      const randomBytesPromisified = promisify(randomBytes);
      const resetToken = (await randomBytesPromisified(20)).toString("hex");
      const resetTokenExpiry = Date.now() + 300000; // 5 minutes from now

      const saltRounds = 10;
      const hash = await bcrypt.hash(resetToken, saltRounds);

      const result = await User.findByIdAndUpdate(
        { _id: user._id },
        {
          resetToken: resetToken,
          resetTokenExpiry: resetTokenExpiry,
        },
        { new: true }
      );
      console.log(result)

      let transport = nodemailer.createTransport({
        host: "smtp.dreamhost.com",
        port: 465,
        auth: {
          user: `${username}`,
          pass: `${password}`
        },
        secure: true,
        logger: true,
        debug: true,
      });


      // Email them the token
      const mailRes = await transport.sendMail({
        from: 'admin@honestpatina.com',
        to: user.email,
        subject: "Cosmic Scramble Password Reset Token",
        // text: 'Honest Patina email reset token: ' + `${resetToken}`,
        html:
          `
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                }
                .message-box {
                  background-color: white;
                  width: 50%;
                  margin: auto;
                  border-radius: 10px;
                  padding: 20px;
                }
                h1 {
                  text-align: center;
                }
                p {
                	font-size: 20px
                }
              </style>
            </head>
            <body>
              <h1>Cosmic Scramble Password Reset</h1>
              <div class="message-box">
                <p>
                  Dear ${user.username},
                </p>
                <p>
                  We're here to help you reset your Cosmic Scramble password. If you didn't initiate this request, feel free to ignore this email.
                </p>
                <p>
                  To get started, simply copy the reset token below and paste it in the "reset token" box on Cosmic Scramble. Please note, the token will expire in 5 minutes.
                </p>
                <p>
                  <strong>Reset Token: ${resetToken}</strong>
                </p>
                <p>
                  We understand how important access to your account is, and we're here to make the process as quick and easy as possible.
                </p>
                <p>
                  Best,<br>
                  The Cosmic Scramble Team
                </p>
              </div>
            </body>
          </html>
          `

      });
      console.log(mailRes)

      return true;

    },
    resetPassword: async (parent, { email, password, confirmPassword, resetToken }, { res }) => {
      console.log(resetToken)
      let lowerCaseEmail = email.toLowerCase();
      const Op = Sequelize.Op;

      // check if passwords match
      if (password !== confirmPassword) {
        throw new Error(`Your passwords don't match`);
      }

      // find the user with that resetToken
      // make sure it's not expired
      const user = await User.findOne(
        { resetToken: resetToken },

      );
      console.log(user)

      // throw error if user doesn't exist
      if (!user) {
        throw new Error(
          "Your password reset token is either invalid or expired."
        )
      }
      console.log(Date.now() - user.resetTokenExpiry)
      if (Date.now() > user.resetTokenExpiry) {
        throw new Error(
          "Your password reset token is either invalid or expired."
        )
      }

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);
      const result = await User.findByIdAndUpdate(
        { _id: user._id },
        {
          password: hash,
          resetToken: "",
          resetTokenExpiry: ""
        }
      );

      console.log(result)


    },
    deleteUser: async (parent, args, context) => {
      try {
        if (!context.user) {
          throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')
        }

        const user = await User.findById({ _id: context.user._id })
        if (!user) {
          throw new ApolloError('User not found', 'AUTHENTICATION_FAILED')
        }

        // const saltRounds = 10;
        // const hash = await bcrypt.hash(args.echo, saltRounds);

        // if (await bcrypt.compare(process.env.ACCESS_PASSWORD, hash)) {
        //   if (context.user.role[0] === 'Admin') {
        console.log("deleteUser")

        if (context.user._id == args.id || context.user.role[0] == 'Admin') {
          console.log("#2")
          const user = await User.findOne({ _id: args.id })

          // for (let i = 0; i < user.games.length; i++) {
          //   await Game.findByIdAndDelete({ _id: user.games[i]._id })
          // }

          const game = await Game.findOne({ userid: user._id })
          console.log(game)
          // await User.updateOne(
          //   { _id: game.userid },
          //   { $pull: { games: { _id: args.id } } },
          // )
          await Game.findByIdAndDelete({ _id: game._id })

          await User.findByIdAndDelete({ _id: args.id })
        }
        //   }
        // } else {
        //   return null;
        // }
      } catch (err) {
        throw new ApolloError('An error occurred while processing the request', 'PROCESSING_ERROR')
      }

      // throw new ApolloError('Unauthorized access', 'AUTHENTICATION_FAILED')

    },

  }
};

module.exports = resolvers;
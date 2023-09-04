// import the gql tagged template function
const { gql } = require('apollo-server-express');

// create our typeDefs
const typeDefs = gql`

  type User {
    _id: ID
    role: [String]
    username: String
    email: String
    profilepicture: String
    games: [Game]
    saved: SavedGame
    tobecontinued: ToBeContinued
    maxstage: String
    highscore: String
    tokens: String
    resetToken: String
    resetTokenExpiry: String,
    currentVersion: String
  }

  type Auth {
    token: ID!
    user: User
  }

  type Game {
    _id: ID,
    userid: String
    username: String
    score: String
    stage: String
    date: String
  }

  type SavedGame {
    _id: ID
    userid: String
    stage: String
    score: String
    level: String
    crashes: String
    letterPocket: String
    displayLetters: String
    currentLetterCountValue: String
    date: String
  }

  type ToBeContinued {
    _id: ID,
    userid: String
    username: String
    score: String
    stage: String
    date: String
  }

  type LeaderBoardEntry {
    id: String
    username: String
    score: String,
    position: String
  }

  type UsersResult {
    users: [User]
  }

  type Query {
    me: User
    users(echo: String): [User]
    user(_id: ID!): User
    getUsers(search: String, echo: String): UsersResult
    games(echo: String): [Game]
    game(_id: ID!): Game
    saved(echo: String): [SavedGame]
    leaderBoard: [LeaderBoardEntry]
  }

  type Mutation {
    login(
      username: String!, 
      password: String!
    ): Auth

    addUser(
      role: [String!],
      username: String!, 
      email: String!,
      profilepicture: String,
      password: String!,
      tokens: String
    ): Auth

    deleteUser(id: ID!): String

    updateUser(
      prevusername: String
      username: String, 
      email: String,
      profilepicture: String,
    ): User

    updateMaxScoreAndStage(
      maxstage: String,
      highscore: String
    ): User

    updateTokenCount(
      userid: String,
      remove: String,
      add: String,
      amount: String
    ): User
    
    updateUserPassword(
      password: String
    ): User

    requestReset(
      email: String
    ): User

    resetPassword(
      email: String
      password: String
      confirmPassword: String
      resetToken: String
    ): User

    addGame(
      userid: String
      username: String
      score: String
      stage: String
      date: String
    ): Game

    addSavedGame(
      userid: String
      stage: String
      score: String
      level: String
      crashes: String
      letterPocket: String
      displayLetters: String
      currentLetterCountValue: String
      date: String
    ): SavedGame

    addToBeContinued(
      userid: String
      username: String
      score: String
      stage: String
      date: String
    ): ToBeContinued

    deleteSavedGame(id: ID!, echo: String): String

    
    deleteGame(id: ID!, echo: String): String
  }
  
`;

// export the typeDefs
module.exports = typeDefs;
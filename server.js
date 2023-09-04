require('dotenv').config();
const express = require('express');
const {ApolloServerPluginLandingPageLocalDefault} = require('apollo-server-core');
const { ApolloServer } = require('apollo-server-express');
const path = require('path');
var cors = require('cors');
const { typeDefs, resolvers, permissions } = require('./schemas');
const { authMiddleware } = require('./utils/auth');
const db = require('./config/connection');
const { Configuration, OpenAIApi } = require("openai");
const jwt = require('jsonwebtoken');


const PORT = process.env.PORT || 3001;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (err) => {
    // Don't give the specific errors to the client
    if (err.message.startsWith('Database Error: ')) {
      return new Error('Internal server error');
     }
     // Otherwise return the original error
     return err;
  },
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
  context: authMiddleware
});

const app = express();
app.use(cors())

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", 
    "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


const validateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, `${process.env.REACT_APP_SECRET}`, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
}

app.get('/protected-route', validateToken, (req, res) => {
  // The request is authenticated. Send the protected data.
  res.send({ data: 'protected data' });
});



// Create a new instance of an Apollo server with the GraphQL schema
const startApolloServer = async (typeDefs, resolvers) => {
  await server.start();
  server.applyMiddleware({ app });

  db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}!`);
      console.log(`Use GraphQL at http://127.0.0.1:${PORT}${server.graphqlPath}`);
    })
  })
  };
  
  // Call the async function to start the server
  startApolloServer(typeDefs, resolvers);


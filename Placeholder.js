// Import the necessary modules
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Import the necessary GraphQL modules
const {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString
} = require('graphql');

// Define the User type
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: {
    id: { type: GraphQLID },
    username: { type: GraphQLString },
    token: { type: GraphQLString }
  }
});

// Define the login mutation
const loginMutation = {
  type: UserType,
  args: {
    username: { type: GraphQLString },
    password: { type: GraphQLString }
  },
  async resolve(parent, { username, password }) {
    // Retrieve the user from the database
    const user = await User.findOne({ username });

    // Validate the user and password
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new Error('Invalid username or password');
    }

    // Generate a JWT token for the user
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    // Return the user and token
    return {
      id: user.id,
      username,
      token
    };
  }
};

// Export the login mutation
module.exports = {
  loginMutation
};

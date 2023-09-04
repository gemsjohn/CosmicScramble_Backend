const { response } = require('express');
const jwt = require('jsonwebtoken');

const secret = `${process.env.REACT_APP_SECRET}`;
// const expiration = '7d';

module.exports = {
  authMiddleware: function({ req }) {
    // allows token to be sent via req.body, req.query, or headers
    let token = req.body.token || req.query.token || req.headers.authorization;
    // console.log("---------------")
    // console.log(token)

    // ["Bearer", "<tokenvalue>"]
    if (req.headers.authorization) {
      token = token
        .split(' ')
        .pop()
        .trim();
    }

    if (!token) {
      return req;
    }

    try {
      const { data } = jwt.verify(token, secret);
      req.user = data;
      // console.log(token)
    } catch {
      console.log('Invalid token');
    }

    return req;
  },
  signToken: function({ username, email, _id, verified, role, upvote, downvote }) {
    const payload = { username, email, _id, verified, role, upvote, downvote};
    // console.log(payload)

  return jwt.sign({ data: payload }, secret);


  },
};

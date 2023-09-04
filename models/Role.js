import { GraphQLEnumType } from "graphql";

const RoleType = new GraphQLEnumType({
    name: 'Role',
    values: {
        ADMIN: {
            value: 0
        },
        USER: {
            value: 1
        }
    }
});
module.exports = RoleType;
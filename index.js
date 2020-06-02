const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

const conectarDB = require('./config/db');


// Conectar a la BD
conectarDB();


// Server
const server = new ApolloServer({
    typeDefs, 
    resolvers,
    context: ({req}) => {

        const token = req.headers['authorization'] || '';
        if(token) {
            try {
                const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.SECRET_SEED);
                return { usuario };
            } catch (error) {
                console.log("Hubo un error");
                console.log(error);
            }
        }
    }
});

// Run server
server.listen().then(({url}) => {
    console.log(`Servidor corriendo en la URL ${url}`);
});
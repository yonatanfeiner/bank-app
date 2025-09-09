// the purpose of this file is to configure Swagger for API documentation
// it is imported in app.js

const PORT = process.env.PORT || 5000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bank App API',
      version: '1.0.0',
      description: 'REST API for a web banking application',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

export default swaggerOptions;

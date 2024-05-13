const express = require('express');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');
const app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // Allows all domains
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Load environment variables from .env file
dotenv.config();

// Import routes from the routes.js file
const routes = require('./routes');

// Load Swagger documentation from a YAML file
const swaggerDocument = YAML.load('./swagger.yaml');

// Create an instance of express

const port = process.env.PORT || 5157;

// Middleware to parse JSON and URL-encoded form data using built-in Express methods
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Swagger UI for API documentation accessible at http://localhost:PORT/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount the API routes directly under the root if required
app.use('/api', routes);

// General error handler for catching and responding to server errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start the server on the specified port
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});

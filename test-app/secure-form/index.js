const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Custom CSRF error handler
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  res.status(403).send('CSRF Token Validation Failed');
});

// Custom validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return res.status(400).send(errorMessages);
  }
  next();
};

// AES encryption and decryption functions
const encryptData = (data, key) => {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encryptedData = cipher.update(data, 'utf8', 'hex');
  encryptedData += cipher.final('hex');
  return encryptedData;
};

const decryptData = (encryptedData, key) => {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');
  return decryptedData;
};

// Form page route
app.get('/', (req, res) => {
  const csrfToken = req.csrfToken();
  res.send(`
    <h1>Form Page</h1>
    <form action="/submit" method="POST">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      
      <label for="data">Data:</label>
      <input type="text" name="data" placeholder="Enter data" required/><br/>

      <label for="yes">Yes:</label>
      <input type="radio" name="yesno" id="yes" value="yes" required/>
  
      <label for="no">No:</label>
      <input type="radio" name="yesno" id="no" value="no" required/>
      
      <label for="hobbies">Hobbies:</label>
      <input type="checkbox" name="hobbies" value="reading"/> Reading
      <input type="checkbox" name="hobbies" value="writing"/> Writing
      <input type="checkbox" name="hobbies" value="painting"/> Painting<br/>
      
      <label for="phone">Phone Number:</label>
      <input type="tel" name="phone" placeholder="Enter phone number" pattern="[0-9]{10}" required/><br/>
      
      <button id="submit" type="submit">Submit</button>
    </form>
  `);
});

// Form validation rules
const validationRules = [
  body('data').trim().notEmpty().withMessage('Data field is required'),
  body('yesno').notEmpty().withMessage('Yes/No field is required'),
  body('hobbies').optional().isArray().withMessage('Hobbies must be an array'),
  body('phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone number must be a 10-digit number'),
];

// Form submission endpoint
app.post('/submit', validationRules, handleValidationErrors, (req, res) => {
  const { data, yesno, hobbies, phone } = req.body;

  // Encrypt the data using a secret key
  const secretKey = 'YourSecretKey'; // Replace with your own secret key
  const encryptedData = encryptData(JSON.stringify(req.body), secretKey);

  // Decrypt the data on the server
  const decryptedData = decryptData(encryptedData, secretKey);
  const decryptedDataObj = JSON.parse(decryptedData);

  res.send(`
    <h1>Received Data</h1>
    <p>Data: ${decryptedDataObj.data}</p>
    <p>Yes/No: ${decryptedDataObj.yesno}</p>
    <p>Hobbies: ${Array.isArray(decryptedDataObj.hobbies) ? decryptedDataObj.hobbies.join(', ') : decryptedDataObj.hobbies}</p>
    <p>Phone Number: ${decryptedDataObj.phone}</p>
  `);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

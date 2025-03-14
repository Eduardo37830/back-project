const express = require('express');
require('dotenv').config();
const connectionDB = require('./config/database');
const routes = require('./routes/routes');
const bodyParser = require('body-parser');
const app = express();

const port =process.env.PORT || 3005;

//console.log(app);

// listen: 2 param puerto y funcion flecha
app.listen(port, () => {
    console.log(`Project running on port ${port}`);

});

app.use(bodyParser.json())
app.use('/api/v1', routes)


/* Repaso funcion flecha */

// const printMessageArrow = () => {
//     return `Segun la extrapolacion de texto y variables tenemos: ${port}`;
// }
/* Repaso funcion anonima */
// const printMessage = function() {
//     return `Segun la extrapolacion de texto y variables tenemos: ${port}`;
// }

// console.log(printMessage());

connectionDB();
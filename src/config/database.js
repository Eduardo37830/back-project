const mongoose = require('mongoose');
require('dotenv').config();

const connectionDB = async() => {

    try {
        const db = await mongoose.connect(process.env.DATABASE_URL)
        console.log(`Batabase connected ${db.connection.name}`);
    } catch (err) {
        console.log(`connection error: ${err}`);
        process.exit(1);
    }
    
    
};

module.exports = connectionDB;


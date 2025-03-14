const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const signUp = async (req, res) => {
    const {fullname, email, current_password} = req.body;
    console.log(req.body);
    
};

const signIn = async (req, res) => {

};

module.exports = {
    signUp,
    signIn
}
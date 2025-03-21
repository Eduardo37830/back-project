const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const signUp = async (req, res) => {
  let { fullname, email, current_password } = req.body;
  console.log(req.body);
  if (email) {
    email = email.toLowerCase().trim(); //Trim quita los espacios en blanco
  }
  console.log(email);
  //validate null/empty field
  if (!fullname || !email || !current_password) {
    return res.status(400).json({
      message: "all required fields: fullname, email and password",
    });
  }
  //valida si el correo electronico tiene @
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //Regex es una expresión regular
  if (!emailRegex.test(email)) {
    //.test es un método de regex
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  if (current_password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characteres",
    });
  }

  try {
    const existinguser = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    //En caso de que encuentre el correo electronico en la BD, el usuario ya existe
    if (existinguser) {
      return res.status(400).json({
        message: "Email allready exists",
      });
    }

    const hashedPassword = await bcrypt.hash(current_password, 10); //Empleamos bycrypt para encriptar la contraseña

    const user = await prisma.users.create({
      data: {
        fullname,
        email,
        current_password: hashedPassword,
      },
    });

    res.status(201).json({
      message: "User created successfull",
      data: user,
    });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({
      message: "Error creating user",
      error,
    });
  }
};

const signIn = async (req, res) => {
  let { email, current_password } = req.body;
  if (email) {
    email = email.toLowerCase().trim(); //Trim quita los espacios en blanco
  }
  console.log(current_password);

  if (!email || !current_password) {
    return res.status(400).json({
      message: "all required fields: fullname, email and password",
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //Regex es una expresión regular para asegurar que sea en formato para correo
  if (!emailRegex.test(email)) {
    //.test es un método de regex
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  try {
    const findUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    if (!findUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const validatePassword = await bcrypt.compare(
      current_password,
      findUser.current_password
    );

    if (!validatePassword) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        return: {
          id: findUser.id,
          email: findUser.email,
        },
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    console.log(token);

    res.status(200).json({
      message: "User logged in successfully",
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error,
    });
  }
};

module.exports = {
  signUp,
  signIn,
};

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Configuración del transporte de correo electrónico
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
}); //Este codigo es muy reutilizable

// Función para generar un código aleatorio de 6 dígitos
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Función para enviar el correo electrónico con el código de verificación
const sendVerificationEmail = async (email, code, fullname) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Código de verificación para tu cuenta",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Verificación de cuenta</h2>
          <p>Hola ${fullname},</p>
          <p>Gracias por registrarte. Para completar tu registro, por favor utiliza el siguiente código de verificación:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>Este código expirará en 15 minutos.</p>
          <p>Si no has solicitado este código, por favor ignora este correo.</p>
          <p>Saludos,<br>El equipo de soporte</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendVerificationSMS = async (telephone, code) => {
  try {
    const message = await client.messages.create({
      body: `Tu código de verificación es: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: telephone // El número de teléfono del destinatario (debe empezar con '+')
    });
    console.log("Send SMS:", message.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};

const verifyCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      message: "Email and verification code are required",
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    // Verificar si el código ha expirado
    const now = new Date();
    if (now > user.verificationCodeExpires) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one.",
      });
    }

    // Verificar si el código es correcto
    if (user.verificationCode !== code) {
      return res.status(400).json({
        message: "Invalid verification code",
      });
    }

    // Actualizar estado del usuario a activo
    await prisma.users.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        verificationCode: null,
        verificationCodeExpires: null,
      },
    });

    // Generar token de autenticación
    const token = jwt.sign(
      {
        id: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "2h",
      }
    );

    res.status(200).json({
      message: "Account verified successfully",
      token,
    });

  } catch (error) {
    console.log("Error during verification:", error);
    res.status(500).json({
      message: "Verification failed",
      error: error.message,
    });
  }
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;
  const {telephone} = req.body;

  if (!telephone){
    return res.status(400).json({
      message: "telephone is required",
    });
  }
  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    // Generar nuevo código y actualizar fecha de expiración
    const newCode = generateVerificationCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        verificationCode: newCode,
        verificationCodeExpires: expirationTime,
      },
    });

    // Enviar nuevo código por correo
    const emailSent = await sendVerificationEmail(email, newCode, user.fullname);

    const smsSent = await sendVerificationSMS(telephone, code)
  

    if (emailSent && smsSent) {
      return res.status(200).json({ message: "Verification code sent successfully. Please check your email and phone." });
    } else if (emailSent) {
      return res.status(200).json({ message: "Verification code sent successfully. Please check your email." });
    } else if (smsSent) {
      return res.status(200).json({ message: "Verification code sent successfully. Please check your phone." });
    } else {
      return res.status(500).json({ message: "Failed to send verification. Please try again later." });
    }
  } catch (error) {
    console.log("Error resending code:", error);
    res.status(500).json({
      message: "Failed to resend verification code",
      error: error.message,
    });
  }
};

const resendVerificationCodeSMS = async (req, res) => {
  const { email } = req.body;
  const {telephone} = req.body;

  if (!telephone){
    return res.status(400).json({
      message: "telephone is required",
    });
  }
  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "User is already verified",
      });
    }

    // Generar nuevo código y actualizar fecha de expiración
    const newCode = generateVerificationCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        verificationCode: newCode,
        verificationCodeExpires: expirationTime,
      },
    });

    const smsSent = await sendVerificationSMS(telephone, code)
  

    if (smsSent) {
      return res.status(200).json({ message: "Verification code sent successfully. Please check your phone." });
    } else {
      return res.status(500).json({ message: "Failed to send verification. Please try again later." });
    }
  } catch (error) {
    console.log("Error resending code:", error);
    res.status(500).json({
      message: "Failed to resend verification code",
      error: error.message,
    });
  }
};

const signUp = async (req, res) => {
  let { fullname, email, current_password, telephone } = req.body;
  console.log(req.body);
  if (email) {
    email = email.toLowerCase().trim(); //Trim quita los espacios en blanco
  }
  console.log(email);
  //validate null/empty field
  if (!fullname || !email || !current_password|| !telephone) {
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

    // Generar un código de verificación
    const verificationCode = generateCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // Expira en 15 minutos

    //Guardar usuario con estado pendiente y codigo de verificación
    const user = await prisma.users.create({
      data: {
        fullname,
        email,
        current_password: hashedPassword,
        status: "PENDING",
        verificationCode: String(verificationCode),
        verificationCodeExpires: expirationTime,
      },
    });

    // Enviar correo con código de verificación
    const emailSent = await sendVerificationEmail(
      email,
      verificationCode,
      fullname
    );

    if (!emailSent) {
      await prisma.users.delete({ where: { id: user.id } });
      return res.status(500).json({ message: "Failed to send verification email. Please try again later." });
    } 

    //Nota: no se envia codigo ni datos sensibles en la respuesta
    res.status(201).json({
      message: "User created successfully. Please check your email for verification code.",
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Error creating user",
      error,
    });
  }
};

const signUpSMS = async (req, res) =>{
  let { fullname, email, current_password, telephone } = req.body;
  console.log(req.body);
  if (email) {
    email = email.toLowerCase().trim(); //Trim quita los espacios en blanco
  }
  console.log(email);
  //validate null/empty field
  if (!fullname || !email || !current_password|| !telephone) {
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

    // Generar un código de verificación
    const verificationCode = generateCode();
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15); // Expira en 15 minutos

    //Guardar usuario con estado pendiente y codigo de verificación
    const user = await prisma.users.create({
      data: {
        fullname,
        email,
        current_password: hashedPassword,
        status: "PENDING",
        verificationCode: String(verificationCode),
        verificationCodeExpires: expirationTime,
      },
    });

    const smsSent = await sendVerificationSMS(
      telephone,
      verificationCode
    )

    if (!smsSent) {
      await prisma.users.delete({ where: { id: user.id } });
      return res.status(500).json({ message: "Failed to send verification phone. Please try again later." });
    }

    //Nota: no se envia codigo ni datos sensibles en la respuesta
    res.status(201).json({
      message: "User created successfully. Please check your phone for verification code.",
      userId: user.id,
      email: user.email
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
      message: "all required fields: email and password",
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
      message: "User logged in successfull",
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
  signUpSMS,
  signIn,
  sendVerificationEmail,
  sendVerificationSMS,
  verifyCode,
  resendVerificationCode,
  resendVerificationCodeSMS
};

import prisma from '../DB/dbConfig.js';
import {generateUniqueCertificateCode} from "../utils/certificateGenerator.js"
import { fileURLToPath } from 'url';
import sendEmail from "../utils/email.js";
import Razorpay from 'razorpay';
// set up env
import dotenv from 'dotenv';
import { verifyOtp } from '../utils/OTP_verification.js';
import { createOrder } from '../utils/razor_pay.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Register the fonts
registerFont(join(__dirname, '../utils/cert/arcadian.regular.ttf'), { family: 'Arcadian' });
registerFont(join(__dirname, '../utils/cert/della_robbia.ttf'), { family: 'Della' });

const font = "Arcadian";
const fontCity = "Della";
const fontColorRGB = "255,255,255"; // White color
const fontColorRGBcity = "146,124,54"; // Custom color
const maxFontSize = 180;
const fontWeight = 1000;

const drawText = (ctx, text, x, y, maxFontSize, maxWidth, fontColorRGB, fontFamily, fontWeight) => {
  const fontSizeIs = (fontFamily, fontWeight, maxFontSize, length, inputValue) => {
    for (let i = maxFontSize; i > 5; i--) {
      ctx.font = `${fontWeight} ${i}px ${fontFamily}`;
      if (ctx.measureText(inputValue).width > length) {
        continue;
      } else {
        return i;
      }
    }
  };

  const YAxisCalculater = (fontFamily, fontWeight, maxFontSize, length, YAxisDefault, inputValue) => {
    ctx.font = `${fontWeight} ${fontSizeIs(fontFamily, fontWeight, maxFontSize, length, inputValue)}px ${fontFamily}`;
    const currentHeight = ctx.measureText(inputValue).actualBoundingBoxAscent + ctx.measureText(inputValue).actualBoundingBoxDescent;
    const originalHeight = ctx.measureText(inputValue).actualBoundingBoxAscent + ctx.measureText(inputValue).actualBoundingBoxDescent;
    const newYAxis = (originalHeight - currentHeight) + YAxisDefault;
    return newYAxis;
  };

  const rgb = fontColorRGB.split(',').map(Number);
  const fontSize = fontSizeIs(fontFamily, fontWeight, maxFontSize, maxWidth, text);
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const centeredX = x + ((maxWidth - textWidth) / 2);
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  ctx.fillText(text, centeredX, YAxisCalculater(fontFamily, fontWeight, maxFontSize, maxWidth, y, text));
};

dotenv.config();

const FEES = process.env.AFFILIATION_FEES;
const GST = process.env.GST;



export const getFees = async (req, res) => {
    res.status(200).json({fees: FEES, gst: GST});
}


export const sendOtp = async (req, res) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const email = req.body.email;
  const type = "aff";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes


    // Upsert user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
      },
    });

    // Upsert OTP for the user
    const otpEntry = await prisma.otp.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type: type,
        },
      },
      update: {
        otp,
        expiresAt,
        salt: '', // Add salt if needed
      },
      create: {
        userId: user.id,
        otp,
        expiresAt,
        type,
        salt: '', // Add salt if needed
      },
    });

    
    await sendEmail(
      email,
      "Affiliation OTP",
      `Your OTP is: ${otp}`
  );

    res.status(200).json({ message: 'OTP sent successfully' });
  
};

export const verifyAffOtp = async (req, res) => {
  const { email, otp } = req.body;
  const type = "aff";
  console.log(email, otp);


    // Get user
    const user = await prisma.user.findFirst({
      where: { email },
    });
    console.log(user);
    // if user not found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Verify OTP
    const v = await verifyOtp(otp, type, user.id);
    console.log(v);
    if (v==true){
      console.log("verified");
      // Get Affiliation data from the body
      
      const affPayment = await prisma.certificate.findFirst({
        where: {
          userId: user.id,
        },
      });
      // upsert to affiliation

      if (affPayment) {
        res.status(200).json({ paymentState: false, order: null , message: 'Payment already done' });
      } else {
        console.log("payment not done, Going for payment");
        // Go for payments
        const {
          schoolName,
          schoolAddress,
          state,
          city,
          contactPersonPrincipalName,
          contactPhoneNumber,
          declaration,
          PrincipalsConclave,
          representIndiaAtCOP,
        } = req.body;
        console.log(declaration);
        const affiliation = await prisma.affiliation.upsert({
          where: { userId: user.id },
          update: {
            schoolName,
            schoolAddress,
            state,
            city,
            contactPersonPrincipalName,
            contactPhoneNumber,
            declaration,
            PrincipalsConclave,
            representIndiaAtCOP,
          },
          create: {
            userId: user.id,
            schoolName,
            schoolAddress,
            state,
            city,
            contactPersonPrincipalName,
            contactPhoneNumber,
            declaration,
            PrincipalsConclave,
            representIndiaAtCOP,
          },
        });
        const amount = parseFloat(FEES*GST/100) + parseFloat(FEES);
          console.log(amount);
          const payment = await prisma.payment.create({
            data: {
              affiliationId: affiliation.id,
              userId: user.id,
              amount,
              currency : 'INR',
              receipt: '', // Placeholder for the receipt
              status: 'created', // Initial status
            },
          });
          const receipt = payment.id.toString();
          const order = await createOrder(amount, "INR", receipt);
          const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
              receipt: payment.id.toString(),
              orderId: order.id,
              status: order.status,
            },
          });
          let paymentState = true;
          res.status(200).json({ order, paymentState });
       
      }

    }else{
      return res.status(400).json({ message: 'Invalid OTP', otpV:false, paymentState: false, order: null });
    }

    

}


export const getCertificate = async (req, res) => {
  const { affiliationId, template } = req.body;
  try {
    res.status(200).json({ message: 'Certificate created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error });
  }
};




const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Verify payment and update status
export const verifyPayment = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature,email } = req.body;

    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status === 'captured') {
      //affiliation
      // Update payment status in the database
      const updatedPayment = await prisma.payment.updateMany({
        where: { orderId: razorpay_order_id },
        data: {
          paymentId: razorpay_payment_id,
          status: 'captured',
          method: payment.method,
        },
      });

      // Add entry to certificate model
      const paymentRecord = await prisma.payment.findFirst({
        where: { orderId: razorpay_order_id },
      });

      const cert = await prisma.certificate.create({
        data: {
          userId: paymentRecord.userId,
          affiliationId: paymentRecord.affiliationId,
          paymentId: paymentRecord.id,
          code: await generateUniqueCertificateCode(),
        },
      });
      const user = await prisma.user.findFirst({
        where: { id: paymentRecord.userId },
      });
      sendEmail(
        user.email,
        'Payment successful',
        `Your payment of INR ${paymentRecord.amount} has been received successfully.
        Your Certificate code is ${cert.code},
        verify at https://indiamun.com/affiliation_certificate`
      );
      res.status(200).json({ message: 'Payment successful', success: true });
    } else {
      sendEmail(email,"may be some error in generating Certificate","If your account is deducted, and you have not received the certificate, please contact us at contact@buzzonearth.com")
      res.status(400).json({ message: 'Payment verification failed' });
    }
};


export const verify_certificate = async (req, res) => {
  const { certificateCode, email, isEmailVerification } = req.body;
  console.log(certificateCode, email, isEmailVerification);
  try {
    let certificate;
    let user;
    if (isEmailVerification) {
      user = await prisma.user.findFirst({
        where: { email },
      });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      certificate = await prisma.certificate.findFirst({
        where: {
          userId: user.id,
        },
      });
    } else {
      certificate = await prisma.certificate.findFirst({
        where: {
          code: certificateCode,
        },
      });
      if (certificate) {
        user = await prisma.user.findFirst({
          where: { id: certificate.userId },
        });
      }
    }

    if (certificate) {
      const affiliation = await prisma.affiliation.findFirst({
        where: {
          id: certificate.affiliationId,
        },
      });

      if (affiliation) {
        // Generate the certificate image
        const imagePath = join(__dirname, '../utils/cert/i.png'); // Replace with actual image path
        const outputImagePath = join(__dirname, '../utils/cert/output.png'); // Replace with actual output path

        loadImage(imagePath).then((img) => {
          const canvas = createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Draw School Name
          drawText(ctx, affiliation.schoolName, 450, 1920, maxFontSize, 1581, fontColorRGB, font, fontWeight);

          // Draw City and State
          drawText(ctx, `${affiliation.city}, ${affiliation.state}`, 450, 2022, 75, 1580, fontColorRGBcity, fontCity, fontWeight);

          // Draw Code
          ctx.font = `50 40px Arial`;
          ctx.fillStyle = `rgb(100, 100, 100)`;
          ctx.fillText(`Code: ${certificate.code} (Verify at: indiamun.org/affiliation_certificate)`, 128, 3450);

          // Save the image
          const buffer = canvas.toBuffer('image/png');
          fs.writeFileSync(outputImagePath, buffer);

          // Convert image to base64
          const base64Image = buffer.toString('base64');

          const responseData = {
            school_name: affiliation.schoolName,
            issue_date: certificate.createdAt.toISOString().split('T')[0], // Assuming createdAt is the issue date
            schoolName: affiliation.schoolName,
            schoolAddress: affiliation.schoolAddress,
            state: affiliation.state,
            city: affiliation.city,
            contactPersonPrincipalName: affiliation.contactPersonPrincipalName,
            declaration: affiliation.declaration,
            PrincipalsConclave: affiliation.PrincipalsConclave,
            representIndiaAtCOP: affiliation.representIndiaAtCOP,
            imageUrl: `data:image/png;base64,${base64Image}`, // Base64-encoded image data
            email: user.email, // Include user email
          };

          // Send email
          const emailSubject = 'Certificate Verification';
          const emailText = `Your certificate has been verified. School Name: ${affiliation.schoolName}`;
          const emailHtml = `
            <h1>Certificate Verification</h1>
            <p>Your certificate has been verified.</p>
            <p>School Name: ${affiliation.schoolName}</p>
            <p>Issue Date: ${certificate.createdAt.toISOString().split('T')[0]}</p>
            <img src="data:image/png;base64,${base64Image}" alt="Certificate Image" />
          `;
          sendEmail(email, emailSubject, emailText, emailHtml);

          res.status(200).json({ message: 'Certificate verified', certificate, affiliation: responseData });
        }).catch((error) => {
          console.error('Error loading image:', error);
          res.status(500).json({ message: 'Error generating certificate image', error });
        });
      } else {
        res.status(404).json({ message: 'Affiliation not found' });
      }
    } else {
      res.status(404).json({ message: 'Certificate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error });
  }
};
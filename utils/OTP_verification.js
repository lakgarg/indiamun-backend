import prisma from '../DB/dbConfig.js';
import dotenv from 'dotenv';
dotenv.config();




const verifyOtp = async(otp, type, userId) =>  {
  const otpData = await prisma.otp.findFirst({
    where: {
      userId: userId,
      type: type,
    },
  });
  console.log("otp data",otpData);
  if (!otpData) {
    return false;
  }
  
    if (otp !== otpData.otp) {
        return false;
    }
    //check expiry time
    if (new Date(otpData.expiresAt) < new Date()) {
        await prisma.otp.delete({
            where: {
                id: otpData.id,
            },
        });
        return false;
    }
    // delete the otp from the database
    await prisma.otp.delete({
        where: {
            id: otpData.id,
        },
    });
    return true;

};

export { verifyOtp };

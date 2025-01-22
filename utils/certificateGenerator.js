import prisma from '../DB/dbConfig.js';

// Generate a 6-digit random pattern (capital alphabets only) with hyphens after the 3rd and 6th characters
const generateRandomPattern = () => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    if (i === 2 || i === 5) {
      result += '-';
    }
  }
  return result;
};

// Generate a unique certificate code
const generateUniqueCertificateCode = async () => {
  let uniqueCode = '';
  let isUnique = false;

  while (!isUnique) {
    const randomPattern = generateRandomPattern();
    const existingCodes = await prisma.certificate.findMany({
      where: {
        code: {
          startsWith: randomPattern,
        },
      },
      orderBy: {
        code: 'desc',
      },
    });

    if (existingCodes.length === 0) {
      uniqueCode = `${randomPattern}001`;
      isUnique = true;
    } else {
      const lastCode = existingCodes[0].code;
      const lastSerialNumber = parseInt(lastCode.split('-')[2], 10);
      const newSerialNumber = lastSerialNumber + 1;

      if (newSerialNumber > 999) {
        continue; // Reshuffle the 6 alphabet pattern if the serial number exceeds 999
      }

      uniqueCode = `${randomPattern}${newSerialNumber.toString().padStart(3, '0')}`;
      isUnique = true;
    }
  }

  return uniqueCode;
};

// // Create a certificate with a unique code
// const createCertificate = async (affiliationId, template) => {
//   const code = await generateUniqueCertificateCode();
//   try {
//     const certificate = await prisma.certificate.create({
//       data: {
//         affiliationId,
//         template,
//         code,
//       },
//     });
//     return certificate;
//   } catch (error) {
//     if (error.code === 'P2002') {
//       // Unique constraint violation, retry
//       return createCertificate(affiliationId, template);
//     }
//     throw error; // If the error is not a unique constraint violation, rethrow it
//   }
// };

export { generateUniqueCertificateCode };

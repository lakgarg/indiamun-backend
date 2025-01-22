import prisma from "../DB/dbConfig.js";

export const affiliationAuthMiddleware = async (req, res, next) => {
  const contactEmail = req.body.contactEmail;
  // check that user exist with contact email or not in user db
  const user = await prisma.user.findUnique({
    where: {
      email: contactEmail,
    },
  });
  req.body.userD = null;
  if (user) {
    // check payments are done or not with that contact email by finding user and then affiliation and then payments
    const affiliation = await prisma.affiliation.findFirst({
      where: {
        userId: user.id,
      },
    });
    // Check payment happened or not
    if (affiliation && affiliation.payments.length > 0) {
      const payment = affiliation.payments[0];
      if (payment.status === "success") {
        return res.status(400).json({ message: "Already Affiliated" });
      }
    }
    req.body.userD = user;
  }
  const {
    schoolName,
    schoolAddress,
    state,
    contactPersonPrincipalName,
    contactPhoneNumber,
    declaration,
    PrincipalsConclave,
    representIndiaAtCOP,
  } = req.body;
  if (
    !schoolName ||
    !schoolAddress ||
    !state ||
    !contactPersonPrincipalName ||
    !contactEmail ||
    !contactPhoneNumber ||
    !declaration
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const affiliation = {
    schoolName,
    schoolAddress,
    state,
    contactPersonPrincipalName,
    contactEmail,
    contactPhoneNumber,
    declaration,
    PrincipalsConclave: PrincipalsConclave,
    representIndiaAtCOP: representIndiaAtCOP,
  };
  req.body.affiliation = affiliation;




  next();
};





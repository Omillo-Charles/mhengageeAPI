const logoUrl = "https://res.cloudinary.com/dtsa39r1g/image/upload/v1789733519/mhenga1_dtlgiu.jpg";

const shell = (title, content) => `
<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f4f0;color:#132238;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:32px auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e2db;padding:32px;">
        <img src="${logoUrl}" alt="MhengaGee Media" width="120" style="display:block;margin:0 0 28px;max-height:80px;object-fit:contain;" />
        <p style="margin:0 0 8px;color:#e45b3f;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">MhengaGee Media</p>
        <h1 style="margin:0 0 24px;font-size:28px;line-height:1.15;">${title}</h1>
        ${content}
      </div>
      <p style="margin:16px 0 0;color:#667085;font-size:12px;text-align:center;">This message was sent by MhengaGee Media.</p>
    </div>
  </body>
</html>`;

export function verificationEmail({ otp }) {
    return {
        subject: "Verify your MhengaGee Media email",
        text: `Your MhengaGee Media verification code is ${otp}. It expires in 10 minutes.`,
        html: shell("Verify your email", `
          <p style="font-size:16px;line-height:1.6;">Use this code to verify your email address:</p>
          <p style="margin:24px 0;font-size:36px;font-weight:bold;letter-spacing:10px;color:#e45b3f;">${otp}</p>
          <p style="color:#667085;font-size:14px;line-height:1.6;">This code expires in 10 minutes. If you did not create an account, you can ignore this email.</p>
        `),
    };
}

export function passwordResetEmail({ resetUrl }) {
    return {
        subject: "Reset your MhengaGee Media password",
        text: `Reset your password here: ${resetUrl}. This link expires in 30 minutes.`,
        html: shell("Reset your password", `
          <p style="font-size:16px;line-height:1.6;">We received a request to reset your password.</p>
          <p style="margin:28px 0;"><a href="${resetUrl}" style="display:inline-block;background:#132238;color:#ffffff;padding:14px 20px;text-decoration:none;font-weight:bold;">Reset password</a></p>
          <p style="color:#667085;font-size:14px;line-height:1.6;">This link expires in 30 minutes. If you did not request a reset, you can ignore this email.</p>
        `),
    };
}
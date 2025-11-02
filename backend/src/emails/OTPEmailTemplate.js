export function createOTPEmailTemplate(name, otp) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OTP Verification</title>
  </head>
  <body style="
    font-family: Arial, sans-serif;
    background-color: #ffe4ec;
    margin: 0;
    padding: 20px;
  ">
    <table width="100%" cellpadding="0" cellspacing="0" style="
      max-width: 600px;
      margin: auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <!-- Header -->
      <tr>
        <td style="
          background-color: #f472b6;
          padding: 30px 20px;
          text-align: center;
        ">
          <h2 style="margin: 0; color: #ffffff;">
            IT4409 Messenger
          </h2>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding: 30px; color: #333;">
          <p style="font-size: 16px; margin-top: 0;">
            Hi <strong>${name}</strong>,
          </p>

          <p style="color: #444;">
            You requested to reset your password (or verify your account).
            Please use the OTP code below to proceed:
          </p>

          <!-- OTP Box -->
          <div style="
            margin: 25px 0;
            padding: 20px;
            background-color: #fff0f6;
            text-align: center;
            border-radius: 8px;
            border: 1px dashed #ec4899;
          ">
            <span style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #db2777;
              display: block;
            ">
              ${otp}
            </span>
          </div>

          <p style="font-size: 14px; color: #555;">
            This code is valid for <strong>10 minutes</strong>.
            If you did not request this, please ignore this email.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="
          background-color: #fce7f3;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #777;
        ">
          <p style="margin: 0;">
            © 2025 IT4409 Messenger - Team 24
          </p>
          <p style="margin: 5px 0 0;">
            Need help? Contact our support team.
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}
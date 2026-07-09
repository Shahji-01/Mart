import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      // Create a test account on Ethereal (mock SMTP for testing)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.initialized = true;
      logger.info("Email service initialized with Ethereal mock SMTP.");
    } catch (err) {
      logger.error({ err }, "Failed to initialize email service");
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    if (!this.transporter) await this.init();
    if (!this.transporter) return;

    try {
      const info = await this.transporter.sendMail({
        from: '"NTC Mart" <noreply@ntcmart.in>',
        to,
        subject: "Welcome to NTC Mart! 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #2563eb;">Welcome, ${name}!</h2>
            <p>Thank you for joining NTC Mart. We are thrilled to have you here.</p>
            <p>Shop for fresh groceries, daily essentials, and organic produce with fast delivery to your doorstep.</p>
            <a href="https://ntcmart.in" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Shop Now</a>
          </div>
        `,
      });
      logger.info(`Welcome email sent to ${to}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (err) {
      logger.error({ err }, "Error sending welcome email");
    }
  }

  async sendOrderConfirmation(to: string, orderId: number, total: string) {
    if (!this.transporter) await this.init();
    if (!this.transporter) return;

    try {
      const info = await this.transporter.sendMail({
        from: '"NTC Mart" <noreply@ntcmart.in>',
        to,
        subject: `Order Confirmation - #${orderId}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #16a34a;">Order Confirmed!</h2>
            <p>Thank you for your order, your order <strong>#${orderId}</strong> has been successfully placed.</p>
            <p>Total amount: <strong>₹${total}</strong></p>
            <p>You can track your order status in your dashboard.</p>
          </div>
        `,
      });
      logger.info(`Order confirmation sent to ${to}. Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } catch (err) {
      logger.error({ err }, "Error sending order confirmation email");
    }
  }
}

export const emailService = new EmailService();

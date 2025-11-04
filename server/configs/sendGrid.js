import sgMail from "@sendgrid/mail";
import "dotenv/config";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Basic sendEmail function
export const sendEmail = async ({ to, subject, body }) => {
  const msg = {
    to,
    from: process.env.SENDER_EMAIL, // Must be verified in SendGrid
    subject,
    html: body,
  };

  try {
    const response = await sgMail.send(msg);
    console.log("Email sent:", response[0].statusCode);
    return response;
  } catch (error) {
    console.error("SendGrid error:", error);
    throw error;
  }
};

// Function used by BullMQ worker
export const sendEmailViaQueueSendGrid = async ({ to, task, origin }) => {
  await sendEmail({
    to,
    subject: `New Task Assigned in ${task.project.name}`,
    body: `<div style="max-width: 6600px;">
             <h2>Hello ${task.assignee.name}, 👋</h2>

             <p style="font-size:16px;">You've been assigned a new task:</p>
             <p style="font-size:18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>

             <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
               <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
               <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
             </div>

             <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                View Task
             </a>

             <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
               Please make sure to review and complete the assigned task before the due date.
             </p>
             </div>
          `,
  });
};

export default sendEmail;

import { createTransport } from "nodemailer";
import prisma from "../configs/prisma.js";
import "dotenv/config";

// Create a test account or replace with real credentials.
const transporter = createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SENDER_EMAIL,
    // user: "softwaredevdad@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) console.log(error);
  else console.log("Server is ready to send emails");
});

const sendEmail = async ({ to, subject, body }) => {
  const response = await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to,
    subject,
    html: body,
  });
  return response;
};

export const sendEmailViaQueue = async ({ to, task, origin }) => {
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

export const newTaskAddedEmail = async (taskId, origin) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    //INFO: We populate the assignee field with the user who created the task and the project details so we know who to send the email to
    include: { assignee: true, project: true },
  });

  if (!task) return null;

  await sendEmail({
    to: task.assignee.email,
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

  // //INFO: Check if the due date is today
  // if (
  //   new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
  // ) {
  //   await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));
  //
  //   await step.run("check-if-task-is-completed", async () => {
  //     const task = await prisma.task.findUnique({
  //       where: { id: taskId },
  //       include: { assignee: true, project: true },
  //     });
  //
  //     if (!task) return;
  //
  //     if (task.status !== "DONE") {
  //       await step.run("send-task-reminder-email", async () => {
  //         await sendEmail({
  //           to: task.assignee.email,
  //           subject: `Reminder: Task ${task.title} is due in ${task.project.name}`,
  //           body: `<div style="max-width: 600px;">
  //                    <h2>Hello ${task.assignee.name}, 👋</h2>
  //
  //                    <p style="font-size:16px;">You have a task due in: ${task.project.name}</p>
  //                    <p style="font-size:18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
  //
  //                    <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
  //                      <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
  //                      <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(
  //                        task.due_date,
  //                      ).toLocaleDateString()}</p>
  //                    </div>
  //                    <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
  //                       View Task
  //                    </a>
  //
  //                    <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
  //                      Please make sure to review and complete the assigned task before the due date.
  //                    </p>
  //                   </div>
  //             `,
  //         });
  //       });
  //     }
  //   });
  // }
};

export default sendEmail;

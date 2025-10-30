import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

//#region New User Create
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  },
);
//#endregion

//#region Delete User
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: { id: data.id },
    });
  },
);
//#endregion

//#region Update User
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: { id: data.id },
      data: {
        email: data?.email_addresses[0]?.email_address,
        name: data?.first_name + " " + data?.last_name,
        image: data?.image_url,
      },
    });
  },
);
//#endregion

//#region Saves Workspace data to the Database
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
  },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    // Add the creator as ADMIN
    await prisma.workspaceMember.create({
      data: { userId: data.created_by, workspaceId: data.id, role: "ADMIN" },
    });
  },
);
//#endregion

//#region Updates workspace data in database
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  },
);
//#endregion

//#region Deletes a workspace from the database
const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-with-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;

    //NOTE: We don't need to do anything else as we have defined cascade in our models so everything related to this workspace gets deleted.
    await prisma.workspace.delete({
      where: { id: data.id },
    });
  },
);
//#endregion

//#region Saves a workspace member to the database
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationInvitation.accepted" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user.id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(), // Match schema convention
      },
    });
  },
);

//#endregion

//#region Send Email on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-email" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      //INFO: We populate the assignee field with the user who created the task and the project details so we know who to send the email to
      include: { assignee: true, project: true },
    });

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

    //INFO: Check if the due date is today
    if (
      new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

      await step.run("check-if-task-is-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!task) return;

        if (task.status !== "DONE") {
          await step.run("send-task-reminder-email", async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Reminder: Task ${task.title} is due in ${task.project.name}`,
              body: `<div style="max-width: 600px;">
                     <h2>Hello ${task.assignee.name}, 👋</h2>

                     <p style="font-size:16px;">You have a task due in: ${task.project.name}</p>
                     <p style="font-size:18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>

                     <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                       <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
                       <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(
                         task.due_date,
                       ).toLocaleDateString()}</p>
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
          });
        }
      });
    }
  },
);
//#endregion

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserUpdation,
  syncUserDeletion,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail,
];

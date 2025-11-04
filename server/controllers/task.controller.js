import { getAuth } from "@clerk/express";
import prisma from "../configs/prisma.js";
import { updateProjectProgress } from "./project.controller.js";
import { emailQueue } from "../queues/emailQueue.js";

//#region Create Task
export const createTask = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");

    // Check if user is ADMIN
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(401).json({
        message:
          "You are not authorized to perform this action - Contact your team lead",
      });
    } else if (
      assigneeId &&
      !project.members.some((member) => member.user.id === assigneeId)
    ) {
      return res.status(401).json({
        message:
          "Assignee is not a member of the project/workspace - Contact your team lead",
      });
    }
    const taskDue = new Date(due_date);
    const projectDue = new Date(project.end_date);

    if (taskDue > projectDue) {
      return res.status(400).json({
        message: "Task can’t be due after the project deadline.",
      });
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        priority: String(priority).toUpperCase(),
        assigneeId,
        status: String(status).toUpperCase(),
        due_date: due_date ? new Date(due_date) : null,
        type: String(type).toUpperCase(),
      },
    });

    const taskWithAssignee = await prisma.task.findUnique({
      where: { id: task.id },
      include: { assignee: true, project: true },
    });

    await updateProjectProgress(task.projectId);

    // await newTaskAddedEmail(task.id, origin);

    try {
      // HACK: We are testing out our new BullMQ workers instead of relying on the above function to fire off - More Reliable method as we can now define some job configs
      await emailQueue.add(
        "new-task-email",
        {
          to: taskWithAssignee.assignee.email,
          task: taskWithAssignee,
          origin,
        },
        {
          attempts: 3, // Rety 3 times
          backoff: 2000, // Wait for 2 seconds before retrying
          removeOnComplete: 100, //N NOTE: Only keep the last 100 jobs in the queue - Good for testing
          // removeOnComplete: true, // NOTE: Using free redis instance so uncomment if we have issues
          removeOnFail: false,
        },
      );
    } catch (error) {
      console.log(error);
    }

    return res.status(200).json({
      task: taskWithAssignee,
      message: "Task created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Update Task
export const updateTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!task) return res.status(404).json({ message: "Task not found" });

    const { userId } = getAuth(req);

    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(401).json({
        message:
          "You are not authorized to perform this action - Contact your team lead",
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await updateProjectProgress(updatedTask.projectId);

    return res.status(200).json({
      task: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Delete Task
export const deleteTask = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { taskIds } = req.body;

    console.log("Task IDs", taskIds);

    if (taskIds.length === 0)
      return res.status(400).json({ message: "No tasks provided" });

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
    });

    if (tasks.length === 0)
      return res.status(404).json({ message: "Tasks not found" });

    const project = await prisma.project.findUnique({
      where: { id: tasks[0].projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res.status(401).json({
        message:
          "You are not authorized to perform this action - Contact your team lead",
      });
    }

    await prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });

    // Get unique projectIds from the deleted tasks
    const affectedProjectIds = [...new Set(tasks.map((t) => t.projectId))];
    console.log(affectedProjectIds);

    // Update progress for each affected project
    await Promise.all(
      affectedProjectIds.map((projectId) => updateProjectProgress(projectId)),
    );

    return res.status(200).json({
      message: "Tasks deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

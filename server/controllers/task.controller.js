import { getAuth } from "@clerk/express";
import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

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
      include: { assignee: true },
    });

    await inngest.send({
      name: "app/task.assigned",
      data: { taskId: task.id, origin },
    });

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

    return res.status(200).json({
      task: updatedTask,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregionk

//#region Delete Task
export const deleteTask = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { taskIds } = req.body;

    console.log("Task IDs", taskIds);

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

    return res.status(200).json({
      message: "Tasks deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

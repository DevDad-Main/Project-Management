import { getAuth } from "@clerk/express";
import prisma from "../configs/prisma.js";

//#region Create Comment
export const createComment = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { content, taskId } = req.body;

    // Check if user is Project Member - To Add a comment to a task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    const member = project.members.find((member) => member.userId === userId);

    if (!member)
      return res
        .status(403)
        .json({ message: "You are not a member of this project" });

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
      include: { user: true },
    });

    return res.status(201).json({
      message: "Comment created successfully",
      comment,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Get Task Comments
export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: true },
    });

    if (comments.length === 0) {
      return res.status(404).json({ message: "Comments not found" });
    }

    return res.status(200).json({
      success: true,
      comments,
      message: "Comments retrieved successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

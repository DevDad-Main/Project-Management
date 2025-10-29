import { getAuth } from "@clerk/express";
import prisma from "../configs/prisma";

//#region Create Project
export const createProject = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const {
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members,
      team_lead,
      progress,
      priority,
    } = req.body;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { include: { user: true } } }, //NOTE: Populating the users data for this workspace
    });

    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    if (
      !workspace.members.some(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    )
      return res
        .status(401)
        .json({ message: "You are not authorized to perform this action" });

    const teamLeader = await prisma.user.findUnique({
      where: { email: team_lead },
      select: { id: true },
    });

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        status,
        priority,
        progress,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        team_lead: teamLeader?.id,
      },
    });

    if (team_members?.length > 0) {
      const membersToAdd = [];
      workspace.members.forEach((member) => {
        if (team_members.includes(member.user.email)) {
          membersToAdd.push(member.user.id);
        }
      });
      await prisma.projectMember.createMany({
        data: membersToAdd.map((userId) => ({
          projectId: project.id,
          userId: userId,
        })),
      });
    }

    //NOTE: Populating the final project data with the members and tasks and comments - Necesary information and send it back to the frontend
    const projectWithMembers = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true, comments: { include: { user: true } } },
        },
        owner: true,
      },
    });

    return res.status(200).json({
      project: projectWithMembers,
      message: "Project created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Update Project
export const updateProject = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const {
      id,
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members,
      team_lead,
      progress,
      priority,
    } = req.body;

    // Check for users ADMIN role
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { include: { user: true } } },
    });

    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    //INFO: Determine whether the user is an admin of the workspace
    if (
      !workspace.members.some(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    ) {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      } else if (project.team_lead !== userId) {
        return res
          .status(401)
          .json({ message: "You are not authorized to perform this action" });
      }
    }

    const project = await prisma.project.update({
      where: { id: id },
      data: {
        workspaceId,
        description,
        name,
        status,
        priority,
        progress,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });

    return res.status(200).json({
      success: true,
      project,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Add Member Project
export const addMemberToProject = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { projectId } = req.params;
    const { email } = req.body;

    // Check if user is project lead
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) return res.status(404).json({ message: "Project not found" });

    if (project.team_lead !== userId) {
      return res.status(401).json({
        message:
          "You are not authorized to perform this action - Contact your team lead",
      });
    }

    // Check if user is already a member of the project
    const exisitingMember = project.members.find((member) => {
      return member.user.email === email;
    });

    if (exisitingMember)
      return res
        .status(400)
        .json({ message: "User already exists in project" });

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Now we have the user and project, we can add them to the project
    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
      },
    });

    return res
      .status(200)
      .json({ sucess: true, member, message: "New member added successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

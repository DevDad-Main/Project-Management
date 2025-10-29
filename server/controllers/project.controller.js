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
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

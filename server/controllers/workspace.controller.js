import { getAuth } from "@clerk/express";
import prisma from "../configs/prisma.js";

//#region Get All Workspaces For User
export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    //NOTE: Very similiar syntax to mongoose, essentially we are doing a chained populate query, include acts as populate
    const workspaces = await prisma.workspace.findMany({
      where: { members: { some: { userId: userId } } },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: { include: { user: true } },
              },
            },
            members: { include: { user: true } },
          },
        },
        owner: true,
      },
    });

    //NOTE: findMany will return an empty Array if no workspaces are found we can check if its truthy of not - Doingit like this will allow us to not get stuck in an endless loop on the front end with the CreateOrganization component- Tells our reducer we have succeeded even if we haven't
    if (workspaces.length === 0)
      return res
        .status(200)
        .json({ message: "No Workspaces Found", workspaces: [] });

    return res.status(200).json({ success: true, workspaces });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

//#region Add Member To Workspace
export const addMemberToWorkspace = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { email, role, workspaceId, message } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!workspaceId || !role)
      return res.status(400).json({ message: "Missing required fields" });
    if (!["ADMIN", "MEMBER"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: { members: true },
    });

    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    if (
      !workspace.members.find(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to perform this action" });
    }
    const exisitingMember = workspace.members.find(
      (member) => member.userId === userId,
    );

    if (exisitingMember) {
      return res
        .status(400)
        .json({ message: "User already exists in workspace" });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        message,
      },
    });

    return res.status(200).json({
      success: true,
      member,
      message: "New member added successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};
//#endregion

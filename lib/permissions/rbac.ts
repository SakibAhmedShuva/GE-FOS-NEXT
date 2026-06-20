import type { SessionUser } from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Permission denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user || !user.isActive) {
    throw new UnauthorizedError();
  }
  return user;
}

export function requireAdmin(user: SessionUser | null): SessionUser {
  const activeUser = requireUser(user);
  if (activeUser.role !== "ADMIN") {
    throw new ForbiddenError("Admin access required");
  }
  return activeUser;
}

export type ProjectAccessRecord = {
  ownerUserId: string;
  status?: "PENDING" | "DELIVERED" | "ARCHIVED";
  shares?: Array<{ sharedWithUserId: string; permission: "VIEW" | "EDIT" }>;
};

export function canAccessProject(user: SessionUser, project: ProjectAccessRecord): boolean {
  if (user.role === "ADMIN") return true;
  if (project.ownerUserId === user.id) return true;
  return Boolean(project.shares?.some((share) => share.sharedWithUserId === user.id));
}

export function canEditProject(user: SessionUser, project: ProjectAccessRecord): boolean {
  if (user.role === "ADMIN") return true;
  if (project.ownerUserId === user.id) return true;
  return Boolean(
    project.shares?.some(
      (share) => share.sharedWithUserId === user.id && share.permission === "EDIT",
    ),
  );
}

export function canDeleteProject(user: SessionUser, project: ProjectAccessRecord): boolean {
  if (project.status === "DELIVERED") return user.role === "ADMIN";
  return canEditProject(user, project);
}

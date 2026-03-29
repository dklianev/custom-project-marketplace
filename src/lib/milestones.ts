import type { Prisma } from "@prisma/client";

function clampOrder(order: number, total: number) {
  return Math.max(1, Math.min(order, total));
}

export async function resequenceMilestones(
  tx: Prisma.TransactionClient,
  projectId: string,
  orderedIds?: string[],
) {
  const milestones = await tx.milestone.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const ids =
    orderedIds && orderedIds.length > 0
      ? orderedIds
      : milestones.map((milestone) => milestone.id);

  await Promise.all(
    ids.map((id, index) =>
      tx.milestone.update({
        where: { id },
        data: { order: index + 1000 },
      }),
    ),
  );

  await Promise.all(
    ids.map((id, index) =>
      tx.milestone.update({
        where: { id },
        data: { order: index + 1 },
      }),
    ),
  );
}

export async function moveMilestoneToOrder(
  tx: Prisma.TransactionClient,
  projectId: string,
  milestoneId: string,
  targetOrder: number,
) {
  const milestones = await tx.milestone.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const remainingIds = milestones
    .map((milestone) => milestone.id)
    .filter((id) => id !== milestoneId);
  const normalizedOrder = clampOrder(targetOrder, remainingIds.length + 1);

  remainingIds.splice(normalizedOrder - 1, 0, milestoneId);
  await resequenceMilestones(tx, projectId, remainingIds);
}

export async function syncProjectProgress(
  tx: Prisma.TransactionClient,
  projectId: string,
) {
  const milestones = await tx.milestone.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const completedCount = milestones.filter((milestone) => milestone.completed).length;
  const progress =
    milestones.length === 0
      ? 0
      : Math.round((completedCount / milestones.length) * 100);

  return tx.project.update({
    where: { id: projectId },
    data: { progress },
    include: {
      milestones: {
        orderBy: { order: "asc" },
      },
    },
  });
}

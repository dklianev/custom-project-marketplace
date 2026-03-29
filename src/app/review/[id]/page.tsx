import { ReviewSubmission, type ReviewProject } from "@/components/review-submission";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/http";
import { ensureProjectAccess } from "@/lib/marketplace";

type Params = Promise<{ id: string }>;

function serializeProject(
  project: Awaited<ReturnType<typeof ensureProjectAccess>>,
): ReviewProject {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    updatedAt: project.updatedAt.toISOString(),
    clientId: project.clientId,
    professionalId: project.professionalId,
    request: {
      title: project.request.title,
      description: project.request.description,
      location: project.request.location,
      budget: project.request.budget,
      timeline: project.request.timeline,
    },
    professional: {
      id: project.professional.id,
      name: project.professional.name,
      avatarUrl: project.professional.avatarUrl,
      location: project.professional.location,
      verified: project.professional.verified,
      rating: project.professional.rating,
      reviewCount: project.professional.reviewCount,
    },
    review: project.review
      ? {
          id: project.review.id,
          rating: project.review.rating,
          comment: project.review.comment,
          createdAt: project.review.createdAt.toISOString(),
        }
      : null,
  };
}

export default async function ReviewPage({ params }: { params: Params }) {
  const { id } = await params;

  let initialProject: ReviewProject | null = null;
  let initialError: string | null = null;

  try {
    const auth = await requireAuth();
    const project = await ensureProjectAccess(id, auth);
    initialProject = serializeProject(project);
  } catch (error) {
    initialError =
      error instanceof AppError
        ? error.message
        : "Не успяхме да заредим проекта за това ревю.";
  }

  return (
    <ReviewSubmission
      projectId={id}
      initialProject={initialProject}
      initialError={initialError}
    />
  );
}

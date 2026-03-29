export type RouteContext<
  T extends Record<string, string | string[] | undefined>,
> = {
  params: Promise<T>;
};

export async function resolveRouteParams<
  T extends Record<string, string | string[] | undefined>,
>(context: RouteContext<T>): Promise<T> {
  return context.params;
}

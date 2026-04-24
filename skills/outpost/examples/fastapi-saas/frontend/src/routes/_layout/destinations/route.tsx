import { createFileRoute, Outlet } from "@tanstack/react-router"

/** Layout segment so `/destinations/:id/activity` matches under `/destinations`, not as a sibling leaf. */
export const Route = createFileRoute("/_layout/destinations")({
  component: () => <Outlet />,
})

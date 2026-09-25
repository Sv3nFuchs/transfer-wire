import { createFileRoute, Outlet } from "@tanstack/react-router";

// A pathless group (no "_public" segment in the URL, same mechanism as
// _authenticated) purely so routes placed here don't nest under an
// existing same-prefix leaf route like players.$playerId.tsx — which
// would otherwise require that page to render an <Outlet/>, something it
// isn't built to do since it's a complete standalone page itself.
export const Route = createFileRoute("/_public")({
  component: () => <Outlet />,
});

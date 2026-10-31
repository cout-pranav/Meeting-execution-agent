import { Navigate, Outlet, useMatches, type RouteObject } from "react-router";
import { ConflictRadar } from "./components/ConflictCallout";
import { Header } from "./components/Header";
import { IngestForm } from "./components/IngestForm";
import { MemoryLedger } from "./components/MemoryLedger";
import { ReviewQueue } from "./components/ReviewQueue";
import { Sidebar } from "./components/Sidebar";
import { StatCards } from "./components/StatCards";
import { TrackerDispatch } from "./components/TrackerDispatch";
import { Empty } from "./components/ui/Empty";
import { Panel } from "./components/ui/Panel";
import { useDashboard, useDashboardContext as usePage, type DashboardState } from "./hooks/useDashboard";

type Handle = { title: string };

/** Sidebar + header + stats around the current tab; pages read the shared state via `useDashboardContext`. */
function Layout() {
  const dash = useDashboard();
  const title = (useMatches().findLast((m) => m.handle)?.handle as Handle | undefined)?.title;

  return (
    <div className="min-h-screen">
      <Sidebar d={dash.d} health={dash.health} healthErr={dash.healthErr} />

      <div className="lg:pl-60">
        <Header title={title} notice={dash.notice} onDismiss={() => dash.setNotice(null)} onRefresh={dash.refresh} />

        <main className="flex flex-col gap-6 p-6">
          <StatCards d={dash.d} health={dash.health} />
          <Outlet context={dash satisfies DashboardState} />
        </main>
      </div>
    </div>
  );
}

function OverviewPage() {
  const { d, health, isBusy, act } = usePage();
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        <ConflictRadar conflicted={d.conflicted} isBusy={isBusy} onAct={act} />
        <ReviewQueue queueByMeeting={d.queueByMeeting} count={d.queue.length} github={!!health?.github} isBusy={isBusy} onAct={act} />
        <MemoryLedger memory={d.memory} />
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
        <IngestPanel />
        <TrackerDispatch dispatched={d.dispatched} repo={health?.github ?? null} />
      </div>
    </div>
  );
}

function IngestPanel() {
  const { health, setNotice } = usePage();
  return <IngestForm health={health} onDone={(text) => setNotice({ tone: "ok", text })} />;
}

function IngestPage() {
  return <div className="max-w-3xl"><IngestPanel /></div>;
}

function ConflictsPage() {
  const { d, isBusy, act } = usePage();
  if (!d.conflicted.length) {
    return (
      <Panel title="Conflict radar" icon="radar">
        <Empty icon="verified">No open contradictions. New decisions that reverse approved ones show up here.</Empty>
      </Panel>
    );
  }
  return <ConflictRadar conflicted={d.conflicted} isBusy={isBusy} onAct={act} />;
}

function ReviewPage() {
  const { d, health, isBusy, act } = usePage();
  return <ReviewQueue queueByMeeting={d.queueByMeeting} count={d.queue.length} github={!!health?.github} isBusy={isBusy} onAct={act} />;
}

function MemoryPage() {
  return <MemoryLedger memory={usePage().d.memory} />;
}

function TrackerPage() {
  const { d, health } = usePage();
  return <TrackerDispatch dispatched={d.dispatched} repo={health?.github ?? null} />;
}

/** One route per sidebar tab; `/` keeps the all-in-one overview. */
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage />, handle: { title: "Decision Intelligence" } satisfies Handle },
      { path: "ingest", element: <IngestPage />, handle: { title: "Ingestion" } satisfies Handle },
      { path: "conflicts", element: <ConflictsPage />, handle: { title: "Conflict Radar" } satisfies Handle },
      { path: "review", element: <ReviewPage />, handle: { title: "Review Queue" } satisfies Handle },
      { path: "memory", element: <MemoryPage />, handle: { title: "Memory Ledger" } satisfies Handle },
      { path: "tracker", element: <TrackerPage />, handle: { title: "Tracker Dispatch" } satisfies Handle },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
];

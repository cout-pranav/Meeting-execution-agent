import { ConflictRadar } from "./components/ConflictCallout";
import { Header } from "./components/Header";
import { IngestForm } from "./components/IngestForm";
import { MemoryLedger } from "./components/MemoryLedger";
import { ReviewQueue } from "./components/ReviewQueue";
import { Sidebar } from "./components/Sidebar";
import { StatCards } from "./components/StatCards";
import { TrackerDispatch } from "./components/TrackerDispatch";
import { useDashboard } from "./hooks/useDashboard";
import { deriveDashboard } from "./lib/selectors";

export function App() {
  const { items, health, healthErr, notice, setNotice, load, act, isBusy } = useDashboard();
  const d = deriveDashboard(items);

  return (
    <div className="min-h-screen">
      <Sidebar d={d} health={health} healthErr={healthErr} />

      <div className="lg:pl-60">
        <Header notice={notice} onDismiss={() => setNotice(null)} onRefresh={load} />

        <main className="flex flex-col gap-6 p-6">
          <StatCards d={d} health={health} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <ConflictRadar conflicted={d.conflicted} isBusy={isBusy} onAct={act} />
              <ReviewQueue queueByMeeting={d.queueByMeeting} count={d.queue.length} github={!!health?.github} isBusy={isBusy} onAct={act} />
              <MemoryLedger memory={d.memory} />
            </div>

            <div className="flex flex-col gap-6 xl:sticky xl:top-20 xl:self-start">
              <IngestForm health={health} onDone={(text) => { setNotice({ tone: "ok", text }); load(); }} />
              <TrackerDispatch dispatched={d.dispatched} repo={health?.github ?? null} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

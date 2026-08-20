import { AppStateProvider, useApp } from "./state";
import { PageShell, TopBar } from "./components/Layout";
import { SkeletonBlock } from "./components/ui";
import { DeskHome } from "./views/DeskHome";
import { GapLab } from "./views/GapLab";
import { FlightRisk } from "./views/FlightRisk";
import { PeerPull } from "./views/PeerPull";
import { ScenariosView } from "./views/Scenarios";
import { PortfolioView } from "./views/Portfolio";
import { EvidenceView } from "./views/Evidence";
import { MethodView } from "./views/Method";

function Screen() {
  const { state } = useApp();

  if (state.loading) {
    return (
      <div className="screen-app">
        <div className="border-b border-ink/8 px-8 py-4">
          <SkeletonBlock className="h-10 w-64" />
        </div>
        <div className="mx-auto max-w-[1440px] px-8 py-10">
          <SkeletonBlock className="h-14 w-[28rem]" />
          <div className="mt-10 grid grid-cols-4 gap-4">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <SkeletonBlock className="mt-8 h-72" />
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Data did not load</h1>
        <p className="mt-3 text-sm text-mute">
          {state.error ?? "Missing JSON."} Run <code>npm run ingest</code> then{" "}
          <code>npm run dev</code> from <code>apps/comp-intel</code>.
        </p>
      </div>
    );
  }

  const view = {
    desk: <DeskHome />,
    gap: <GapLab />,
    flight: <FlightRisk />,
    peers: <PeerPull />,
    scenarios: <ScenariosView />,
    portfolio: <PortfolioView />,
    evidence: <EvidenceView />,
    method: <MethodView />,
  }[state.view];

  return (
    <div className="screen-app">
      <TopBar />
      <PageShell>{view}</PageShell>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <Screen />
    </AppStateProvider>
  );
}

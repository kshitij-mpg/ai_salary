import { AppStateProvider, useApp } from "./state";
import { PageShell, TopBar } from "./components/Layout";
import { SkeletonBlock } from "./components/ui";
import { ExecutiveBrief } from "./views/ExecutiveBrief";
import { MarketExplorer } from "./views/MarketExplorer";
import { RoleComparator } from "./views/RoleComparator";
import { SourceStudio } from "./views/SourceStudio";
import { MethodTrust } from "./views/MethodTrust";
import { ClientSnapshot } from "./views/ClientSnapshot";

function Screen() {
  const { state } = useApp();

  if (state.loading) {
    return (
      <div className="screen-app">
        <div className="border-b border-gold/10 px-8 py-4">
          <SkeletonBlock className="h-10 w-64" />
        </div>
        <div className="mx-auto max-w-[1600px] px-8 py-10">
          <SkeletonBlock className="h-16 w-96" />
          <div className="mt-10 grid grid-cols-4 gap-6">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-28" />
          </div>
          <SkeletonBlock className="mt-10 h-72" />
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
    brief: <ExecutiveBrief />,
    explorer: <MarketExplorer />,
    compare: <RoleComparator />,
    studio: <SourceStudio />,
    method: <MethodTrust />,
    snapshot: <ClientSnapshot />,
  }[state.view];

  return (
    <>
      <div className="screen-app">
        <TopBar />
        <PageShell>{view}</PageShell>
      </div>
      <div className="hidden print:block">
        <ClientSnapshot />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <div className="grain" aria-hidden />
      <Screen />
    </AppStateProvider>
  );
}

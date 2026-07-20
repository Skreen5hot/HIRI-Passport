import { useAppState } from "../../state/app-state";
import { EmptyState } from "./empty-state";
import { RecordCard } from "./record-card";
export function HomeRoute() { const { credentials } = useAppState(); return <section className="stack"><header className="page-heading"><div><p className="eyebrow">Private portfolio</p><h1>Your Passport</h1><p className="lede">{credentials.length} local records. This count is not transmitted in a presentation.</p></div><a className="button" href="#/acquire">Add record</a></header>{credentials.length ? <div className="grid">{credentials.map(record => <RecordCard key={record.recordId} record={record} />)}</div> : <EmptyState />}</section>; }

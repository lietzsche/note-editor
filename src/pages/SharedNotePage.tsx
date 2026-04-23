import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Note } from "../lib/api";

type SharedNoteViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; note: Note };

export default function SharedNotePage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [state, setState] = useState<SharedNoteViewState>({ kind: "loading" });

  useEffect(() => {
    if (!shareToken) {
      setState({ kind: "error", message: "공유 링크가 올바르지 않습니다." });
      return;
    }

    setState({ kind: "loading" });
    api.shared.get(shareToken)
      .then((note) => {
        setState({ kind: "ready", note });
      })
      .catch((error) => {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "노트를 불러올 수 없습니다.",
        });
      });
  }, [shareToken]);

  return <SharedNoteView state={state} />;
}

export function SharedNoteView({ state }: { state: SharedNoteViewState }) {
  if (state.kind === "loading") {
    return (
      <main className="shared-shell">
        <section className="shared-state-card" role="status" aria-live="polite">
          <span className="shared-state-card__eyebrow">공유 노트</span>
          <h1 className="shared-state-card__title">노트를 불러오는 중입니다</h1>
          <p className="shared-state-card__body">공개 링크의 유효성을 확인하고 읽기 전용 화면을 준비합니다.</p>
        </section>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className="shared-shell">
        <section className="shared-state-card is-error" role="alert">
          <span className="shared-state-card__eyebrow">접근 불가</span>
          <h1 className="shared-state-card__title">공유 노트를 열 수 없습니다</h1>
          <p className="shared-state-card__body">{state.message}</p>
          <p className="shared-state-card__hint">
            링크가 만료되었거나 소유자가 공유를 껐을 수 있습니다. 새 공유 링크를 요청하세요.
          </p>
        </section>
      </main>
    );
  }

  const { note } = state;

  return (
    <main className="shared-shell">
      <article className="shared-note-card" aria-labelledby="shared-note-title">
        <header className="shared-note-card__header">
          <span className="shared-note-card__eyebrow">읽기 전용 공유 노트</span>
          <h1 id="shared-note-title" className="shared-note-card__title">
            {note.title || "제목 없음"}
          </h1>
          <p className="shared-note-card__meta">
            마지막 업데이트: {formatUpdatedAt(note.updated_at)}
          </p>
        </header>

        <div className="shared-note-card__content">
          {note.content || "빈 본문입니다."}
        </div>

        <footer className="shared-note-card__footer">
          이 화면에서는 노트를 수정할 수 없습니다. 소유자가 공유를 끄면 이 링크는 즉시 접근할 수 없게 됩니다.
        </footer>
      </article>
    </main>
  );
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "알 수 없음";

  return date.toLocaleString("ko-KR");
}

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "../src/pages/LoginPage";
import { AdminConsolePanel } from "../src/components/AdminConsolePanel";

describe("FEATURE-009 admin console UI", () => {
  it("renders the account recovery panel with search, password result, and audit history", () => {
    const markup = renderToStaticMarkup(
      <AdminConsolePanel
        isOpen
        currentUsername="admin"
        searchQuery="ali"
        users={[
          {
            id: "user-1",
            username: "alice",
            created_at: "2026-04-24T00:00:00.000Z",
          },
        ]}
        usersLoading={false}
        usersError={null}
        auditEntries={[
          {
            id: "audit-1",
            admin_user_id: "admin-1",
            admin_username: "admin",
            target_user_id: "user-1",
            target_username: "alice",
            reset_mode: "generated",
            created_at: "2026-04-24T01:00:00.000Z",
          },
        ]}
        auditLoading={false}
        auditError={null}
        actionError={null}
        pendingResetUserId={null}
        resetBusyUserId={null}
        resetResult={{
          userId: "user-1",
          username: "alice",
          tempPassword: "TempPass1234",
          resetAt: "2026-04-24T01:00:00.000Z",
          resetBy: "admin",
        }}
        passwordCopyState="idle"
        onClose={() => {}}
        onSearchQueryChange={() => {}}
        onRequestReset={() => {}}
        onCancelReset={() => {}}
        onConfirmReset={() => {}}
        onCopyPassword={() => {}}
        onDismissResetResult={() => {}}
      />
    );

    expect(markup).toContain("계정 복구");
    expect(markup).toContain("username 검색");
    expect(markup).toContain("@alice");
    expect(markup).toContain("TempPass1234");
    expect(markup).toContain("generated");
  });
});

describe("login page redesign", () => {
  it("renders the refreshed workspace-focused login screen", () => {
    const markup = renderToStaticMarkup(<LoginPage onLogin={() => {}} />);

    expect(markup).toContain("노트와 작업 흐름을 바로 이어가는 개인 작업 공간");
    expect(markup).toContain("로그인");
    expect(markup).toContain("회원가입");
    expect(markup).toContain("운영자 계정 복구");
    expect(markup).toContain("로그인하기");
  });
});

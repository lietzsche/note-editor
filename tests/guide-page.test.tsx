import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "../src/pages/LoginPage";
import { GuideView } from "../src/pages/GuidePage";

describe("user guide page (/guide)", () => {
  it("renders guide sections, status legend, and login navigation when unauthenticated", () => {
    const markup = renderToStaticMarkup(
      <GuideView isAuthenticated={false} username={null} />
    );

    expect(markup).toContain("사용 가이드");
    expect(markup).toContain("로그인 화면으로 이동");
    expect(markup).toContain("실시간 자동 저장과 충돌 감지");
    expect(markup).toContain("그룹 구성 및 드래그 앤 드롭 정렬");
    expect(markup).toContain("몰입 모드 (Zen Mode)");
    expect(markup).toContain("읽기 전용 공개 공유 링크");
    expect(markup).toContain("자동 저장 상태 배지 읽는 법");
    expect(markup).toContain("단축키 및 빠른 조작 요약");
  });

  it("renders workspace return navigation and username badge when authenticated", () => {
    const markup = renderToStaticMarkup(
      <GuideView isAuthenticated username="alice" />
    );

    expect(markup).toContain("@alice");
    expect(markup).toContain("작업 공간으로 돌아가기");
    expect(markup).toContain("작업 공간으로 돌아가 바로 작성하기");
  });

  it("exposes guide entry links on the login screen", () => {
    const markup = renderToStaticMarkup(<LoginPage onLogin={() => {}} />);

    expect(markup).toContain('href="/guide"');
    expect(markup).toContain("가이드");
    expect(markup).toContain("사용 가이드 및 주요 기능 살펴보기");
  });
});

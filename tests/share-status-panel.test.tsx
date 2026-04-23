import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShareStatusPanel, type ShareInfo } from "../src/components/ShareStatusPanel";

describe("ShareStatusPanel", () => {
  it("shows inactive sharing as a private state with a clear action", () => {
    const markup = renderToStaticMarkup(
      <ShareStatusPanel
        styles={buildStyles()}
        shareInfo={null}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("공개 링크가 꺼져 있습니다");
    expect(markup).toContain("비공개");
    expect(markup).toContain("공유 링크 만들기");
  });

  it("shows active sharing metadata and the public link", () => {
    const shareInfo: ShareInfo = {
      share_token: "token",
      is_active: true,
      expires_at: null,
      access_count: 3,
      share_url: "/shared/token",
    };

    const markup = renderToStaticMarkup(
      <ShareStatusPanel
        styles={buildStyles()}
        shareInfo={shareInfo}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("공개 링크가 켜져 있습니다");
    expect(markup).toContain("href=\"/shared/token\"");
    expect(markup).toContain("조회 3회");
    expect(markup).toContain("만료 없음");
    expect(markup).toContain("공유 끄기");
  });

  it("renders share errors as alert text", () => {
    const markup = renderToStaticMarkup(
      <ShareStatusPanel
        styles={buildStyles()}
        shareInfo={null}
        shareLoading={false}
        shareError="공유 설정 변경에 실패했습니다."
        onShareToggle={() => {}}
      />
    );

    expect(markup).toContain("role=\"alert\"");
    expect(markup).toContain("공유 설정 변경에 실패했습니다.");
  });

  it("omits long helper text in small size", () => {
    const markup = renderToStaticMarkup(
      <ShareStatusPanel
        styles={buildStyles()}
        shareInfo={null}
        shareLoading={false}
        shareError={null}
        onShareToggle={() => {}}
        size="sm"
      />
    );

    expect(markup).toContain("공개 링크가 꺼져 있습니다");
    expect(markup).not.toContain("필요할 때만 공개 링크를 만들고");
  });
});

function buildStyles() {
  return new Proxy(
    {},
    {
      get: () => ({}),
    }
  ) as Record<string, React.CSSProperties>;
}

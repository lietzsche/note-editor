import { describe, expect, it } from "vitest";
import {
  getNoteGroupIdFromSelectValue,
  getNoteGroupSelectValue,
} from "../src/lib/noteGroupSelect";

describe("BACKLOG-001 노트 그룹 선택값 유틸", () => {
  it("기본 그룹 노트는 기본 그룹 id를 select value로 사용한다", () => {
    expect(getNoteGroupSelectValue(null, "default_group")).toBe("default_group");
  });

  it("일반 그룹 노트는 자신의 group id를 그대로 사용한다", () => {
    expect(getNoteGroupSelectValue("work_group", "default_group")).toBe("work_group");
  });

  it("기본 그룹 option 선택값은 null group id로 변환한다", () => {
    expect(getNoteGroupIdFromSelectValue("default_group", "default_group")).toBeNull();
  });

  it("일반 그룹 option 선택값은 그대로 유지한다", () => {
    expect(getNoteGroupIdFromSelectValue("personal_group", "default_group")).toBe("personal_group");
  });
});

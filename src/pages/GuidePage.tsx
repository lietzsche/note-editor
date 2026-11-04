import { useState, type ReactNode } from "react";
import { Link, useInRouterContext } from "react-router-dom";
import ThemeToggle from "../components/ThemeToggle";

function SpaLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
}

export type GuideCategoryId = "all" | "writing" | "organize" | "focus" | "sharing";

type Props = {
  isAuthenticated?: boolean;
  username?: string | null;
};

type GuideFeatureCard = {
  id: string;
  category: Exclude<GuideCategoryId, "all">;
  badge: string;
  title: string;
  summary: string;
  highlights: string[];
  tip: string;
};

const CATEGORIES: Array<{ id: GuideCategoryId; label: string; count: number }> = [
  { id: "all", label: "전체 보기", count: 8 },
  { id: "writing", label: "작성 · 자동 저장", count: 2 },
  { id: "organize", label: "그룹 · 검색 · 휴지통", count: 3 },
  { id: "focus", label: "몰입 모드 · 모바일", count: 1 },
  { id: "sharing", label: "공유 링크 · 보안", count: 2 },
];

const FEATURE_CARDS: GuideFeatureCard[] = [
  {
    id: "auto-save-conflict",
    category: "writing",
    badge: "Auto Save & Conflict",
    title: "실시간 자동 저장과 충돌 감지",
    summary:
      "제목과 본문을 입력하면 별도의 저장 버튼 없이 자동으로 서버에 안전하게 기록되며, 다른 기기에서 동시에 수정된 경우 덮어쓰기 전에 비교 화면을 띄워 줍니다.",
    highlights: [
      "입력 멈춤 후 자동으로 서버 저장 및 상태 배지(저장됨 · 수정 중 · 자동 저장 중) 실시간 갱신",
      "미저장 상태에서 다른 노트·그룹·가이드로 이동할 때 유실 방지 확인 모달 자동 표시",
      "다중 기기 동시 편집 충돌 시 내 편집본과 서버 최신본을 나란히 비교 후 선택 가능",
    ],
    tip: "네트워크가 일시적으로 불안정해 '저장 실패'가 표시되더라도 작성 중인 본문은 유지되며 '다시 시도' 버튼으로 즉시 재저장할 수 있습니다.",
  },
  {
    id: "editor-productivity",
    category: "writing",
    badge: "Productivity Tools",
    title: "글자수 확인 · 전체 복사 · 맞춤법 검사",
    summary:
      "에디터 상단 유틸리티 바에서 글자수(Grapheme 기준)를 실시간으로 확인하고, 본문 전체 복사 및 외부 한국어 맞춤법 검사기 연동을 바로 실행할 수 있습니다.",
    highlights: [
      "이모지·한글 조합 문자를 정확히 세는 실시간 글자수 표시기(최대 20,000자)",
      "'전체 복사' 버튼 클릭 한 번으로 본문 전체를 클립보드에 즉시 복사",
      "'맞춤법 검사' 버튼으로 외부 검사기를 새 탭에서 열어 복사한 본문을 바로 붙여넣기",
    ],
    tip: "긴 글을 다듬을 때는 '전체 복사'를 먼저 누른 뒤 바로 옆의 '맞춤법 검사'를 클릭하면 가장 빠르게 검사를 진행할 수 있습니다.",
  },
  {
    id: "groups-and-reorder",
    category: "organize",
    badge: "Groups & Drag Order",
    title: "그룹 구성 및 드래그 앤 드롭 정렬",
    summary:
      "주제별로 그룹을 만들어 노트를 깔끔하게 분류하고, 드래그 핸들(≡)을 끌어 그룹 순서와 노트 순서를 원하는 대로 배치할 수 있습니다.",
    highlights: [
      "좌측(모바일은 '그룹' 탭)에서 새 그룹 추가, 인라인 이름 변경, 삭제 지원",
      "그룹을 삭제하더라도 소속 노트는 삭제되지 않고 '미분류' 그룹으로 안전하게 자동 이동",
      "그룹 목록과 노트 목록 모두 '≡' 핸들을 드래그해 순서 변경 및 서버 즉시 동기화",
    ],
    tip: "전체 노트에서 정렬한 순서는 개별 그룹 내 순서에도 자연스럽게 반영되며, 이미 불러온 노트는 그룹 전환 시 0ms로 즉시 전환됩니다.",
  },
  {
    id: "search-and-match-nav",
    category: "organize",
    badge: "Instant Search",
    title: "실시간 하이라이트 검색과 본문 일치 탐색",
    summary:
      "검색창에 키워드를 입력하면 제목과 본문에서 일치하는 노트를 즉시 추려내고, 노트를 열면 본문 내 몇 번째 위치에 키워드가 있는지 앞뒤로 이동하며 확인할 수 있습니다.",
    highlights: [
      "대소문자 구분 없이 제목·본문 동시 검색 및 키워드 하이라이트 미리보기 제공",
      "에디터 상단 'SEARCH MATCH' 패널에서 제목·본문 일치 개수 요약 표시",
      "본문 내 여러 개가 일치할 때 '<' '>' 버튼으로 각 문맥 구간을 순서대로 탐색",
    ],
    tip: "검색 정보 패널이 본문 공간을 가릴 때는 '숨기기'를 눌러 접어두었다가 툴바의 '검색 정보' 버튼으로 언제든 다시 펼칠 수 있습니다.",
  },
  {
    id: "trash-and-restore",
    category: "organize",
    badge: "Safe Trash",
    title: "휴지통 보관 · 복원 · 영구 삭제",
    summary:
      "삭제한 노트는 즉시 사라지지 않고 휴지통으로 이동하여 읽기 전용으로 내용을 확인하거나 원래 그룹으로 복원할 수 있습니다.",
    highlights: [
      "노트 삭제 시 휴지통으로 안전 이동 및 기존 공개 공유 링크 자동 비활성화",
      "휴지통에서 노트를 선택해 삭제 시각과 본문 내용을 읽기 전용으로 열람 가능",
      "'복원' 클릭 시 즉시 원래 노트로 되돌리며, '영구 삭제'는 2단계 확인 후 완전 삭제",
    ],
    tip: "실수로 노트를 지웠더라도 그룹 목록 상단의 '휴지통'에서 언제든지 원클릭으로 복원할 수 있습니다.",
  },
  {
    id: "zen-and-mobile",
    category: "focus",
    badge: "Zen Mode & Mobile UX",
    title: "몰입 모드 (Zen Mode) 및 모바일 맞춤 환경",
    summary:
      "복잡한 주변 패널을 모두 숨기고 오직 글쓰기에만 집중할 수 있는 몰입 모드와, 스마트폰 한 손 조작에 최적화된 하단 탭바를 제공합니다.",
    highlights: [
      "데스크톱에서 본문을 이어 쓰면 약 1초 후 제목·본문·저장 상태만 남기는 자동 집중 화면으로 전환",
      "왼쪽 화면 가장자리 또는 Ctrl/Cmd + [로 편집기 폭을 바꾸지 않는 노트 탐색 오버레이 표시",
      "데스크톱에서 '몰입 모드' 클릭 또는 Ctrl + \\ (Mac은 Cmd + \\) 단축키로 즉시 전환",
      "모바일에서는 엄지손가락이 닿기 쉬운 화면 하단에 '그룹 / 목록 / 편집 / 새 노트' 탭바 배치",
      "모바일 몰입 모드 진입 시 하단 탭바와 유틸리티 줄까지 숨겨 최대 본문 영역 확보",
    ],
    tip: "자동 집중은 계정 영역에서 끌 수 있습니다. 모바일 몰입 모드에서는 제목 줄의 눈 모양 아이콘이나 '< 목록'으로 돌아옵니다.",
  },
  {
    id: "public-share-link",
    category: "sharing",
    badge: "Public Share",
    title: "읽기 전용 공개 공유 링크",
    summary:
      "특정 노트를 다른 사람에게 보여주고 싶을 때, 로그인 없이 열람할 수 있는 읽기 전용 공개 링크를 즉시 만들고 언제든 끌 수 있습니다.",
    highlights: [
      "에디터 툴바의 '공유' 버튼을 눌러 팝오버에서 원클릭으로 공개 링크 생성 및 복사",
      "누적 조회수 확인 및 '새 탭에서 열기'로 외부에 보이는 화면을 바로 미리보기",
      "'공유 끄기'를 누르는 즉시 기존 링크 접근이 차단되어 안전하게 비공개로 전환",
    ],
    tip: "공유 화면(/shared/:token)에서도 방문자가 본문 전체 복사와 라이트/다크 테마 전환을 편리하게 사용할 수 있습니다.",
  },
  {
    id: "security-and-recovery",
    category: "sharing",
    badge: "Security & Recovery",
    title: "계정 보안 및 임시 비밀번호 복구",
    summary:
      "7일 고정 HttpOnly 쿠키 세션으로 계정을 보호하며, 비밀번호 변경 시 다른 기기의 세션을 즉시 만료시켜 안전을 유지합니다.",
    highlights: [
      "사이드바 하단 '보안' 버튼에서 언제든지 현재 비밀번호 확인 후 새 비밀번호로 변경",
      "비밀번호 변경 시 현재 브라우저만 로그인 상태를 유지하고 다른 모든 기기 세션은 자동 로그아웃",
      "비밀번호 분실 시 운영자가 발급한 임시 비밀번호로 로그인하면 즉시 새 비밀번호 설정 화면으로 안내",
    ],
    tip: "공용 PC에서 로그인했더라도 내 기기에서 비밀번호를 변경하면 다른 기기의 세션이 즉시 무효화됩니다.",
  },
];

const STATUS_BADGES = [
  { label: "저장됨", tone: "success", desc: "서버에 최신 내용이 안전하게 저장된 상태" },
  { label: "수정 중", tone: "neutral", desc: "입력 후 자동 저장 대기 중이거나 추가 입력이 있는 상태" },
  { label: "자동 저장 중", tone: "neutral", desc: "서버로 변경 사항을 전송하고 있는 상태" },
  { label: "저장 실패", tone: "danger", desc: "네트워크 오류 등으로 저장이 중단된 상태 (다시 시도 가능)" },
  { label: "충돌 감지", tone: "danger", desc: "다른 기기에서 먼저 수정되어 비교 확인이 필요한 상태" },
  { label: "읽기 전용", tone: "neutral", desc: "휴지통에 보관된 노트로 수정 없이 열람·복원만 가능한 상태" },
];

export default function GuidePage({ isAuthenticated = false, username = null }: Props) {
  return <GuideView isAuthenticated={isAuthenticated} username={username} />;
}

export function GuideView({ isAuthenticated = false, username = null }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<GuideCategoryId>("all");

  const visibleCards =
    selectedCategory === "all"
      ? FEATURE_CARDS
      : FEATURE_CARDS.filter((card) => card.category === selectedCategory);

  const destinationPath = isAuthenticated ? "/" : "/login";
  const destinationLabel = isAuthenticated ? "← 작업 공간으로 돌아가기" : "← 로그인 화면으로 이동";

  return (
    <main className="guide-shell">
      <div className="guide-container">
        <nav className="guide-topbar" aria-label="가이드 상단 내비게이션">
          <div className="guide-topbar__brand">
            <span className="guide-eyebrow">NOTE EDITOR · GUIDE</span>
            {isAuthenticated && username && (
              <span className="guide-user-pill">@{username}</span>
            )}
          </div>
          <div className="guide-topbar__actions">
            <ThemeToggle compact />
            <SpaLink to={destinationPath} className="guide-back-link">
              {destinationLabel}
            </SpaLink>
          </div>
        </nav>

        <header className="guide-header">
          <div className="guide-hero">
            <div className="guide-hero__copy">
              <span className="guide-hero__kicker">사용 가이드</span>
              <h1 className="guide-title">
                빠르게 기록하고 안전하게 정리하는 방법
              </h1>
              <p className="guide-subtitle">
                Note Editor의 실시간 자동 저장, 그룹·순서 정리, 본문 검색 탐색, 몰입 모드, 그리고 공개 공유 링크까지 핵심 기능을 한눈에 확인해 보세요.
              </p>
            </div>

            <div className="guide-quick-steps" aria-label="3단계 빠른 시작">
              <div className="guide-step-card">
                <div className="guide-step-card__head">
                  <span className="guide-step-card__num">STEP 01</span>
                  <strong>그룹 선택 & 새 노트 작성</strong>
                </div>
                <p>원하는 그룹(또는 전체 노트)에서 &lsquo;+ 새 노트&rsquo;를 눌러 바로 제목과 본문을 작성하세요.</p>
              </div>
              <div className="guide-step-card">
                <div className="guide-step-card__head">
                  <span className="guide-step-card__num">STEP 02</span>
                  <strong>자동 저장 & 몰입 모드</strong>
                </div>
                <p>입력하는 즉시 자동 저장되며, 집중이 필요할 땐 몰입 모드(Ctrl + \)로 화면을 비우세요.</p>
              </div>
              <div className="guide-step-card">
                <div className="guide-step-card__head">
                  <span className="guide-step-card__num">STEP 03</span>
                  <strong>드래그 정렬 & 링크 공유</strong>
                </div>
                <p>&lsquo;≡&rsquo; 핸들로 순서를 정리하고, 필요한 노트만 공개 공유 링크로 외부에 전달하세요.</p>
              </div>
            </div>
          </div>
        </header>

        <section className="guide-filter-section" aria-label="가이드 카테고리 선택">
          <div className="guide-tabs" role="tablist" aria-label="기능 카테고리">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`guide-tab${active ? " is-active" : ""}${category.id === "all" ? " guide-tab--all" : ""}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="guide-tab__label">{category.label}</span>
                  <span className="guide-tab__count">{category.count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="guide-grid" aria-label="기능 상세 안내">
          {visibleCards.map((card) => (
            <article key={card.id} className="guide-card">
              <div className="guide-card__main">
                <div className="guide-card__header">
                  <span className="guide-card__badge">{card.badge}</span>
                  <h2 className="guide-card__title">{card.title}</h2>
                  <p className="guide-card__summary">{card.summary}</p>
                </div>

                <ul className="guide-card__list">
                  {card.highlights.map((item) => (
                    <li key={item} className="guide-card__list-item">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="guide-card__tip">
                <span className="guide-card__tip-label">TIP</span>
                <p>{card.tip}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="guide-reference-grid" aria-label="상태 배지 및 단축키 요약">
          <article className="guide-ref-panel">
            <div className="guide-ref-panel__header">
              <span className="guide-card__badge">Save Status</span>
              <h2 className="guide-ref-panel__title">자동 저장 상태 배지 읽는 법</h2>
              <p className="guide-ref-panel__desc">
                에디터 상단 좌측에 표시되는 상태 배지로 현재 노트의 저장 상태를 즉시 파악할 수 있습니다.
              </p>
            </div>
            <div className="guide-status-list">
              {STATUS_BADGES.map((badge) => (
                <div key={badge.label} className="guide-status-row">
                  <span className={`guide-status-pill is-${badge.tone}`}>
                    {badge.label}
                  </span>
                  <span className="guide-status-desc">{badge.desc}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="guide-ref-panel">
            <div className="guide-ref-panel__header">
              <span className="guide-card__badge">Shortcuts & Touch</span>
              <h2 className="guide-ref-panel__title">단축키 및 빠른 조작 요약</h2>
              <p className="guide-ref-panel__desc">
                데스크톱 키보드 단축키와 모바일 터치 제스처로 더 빠르게 이동하고 편집하세요.
              </p>
            </div>
            <div className="guide-shortcut-list">
              <div className="guide-shortcut-row">
                <div className="guide-kbd-group">
                  <kbd className="guide-kbd">Ctrl</kbd>
                  <span>+</span>
                  <kbd className="guide-kbd">\</kbd>
                </div>
                <span className="guide-status-desc">
                  몰입 모드(Zen Mode) 켜기 / 끄기 (Mac은 <kbd className="guide-kbd">Cmd</kbd> + <kbd className="guide-kbd">\</kbd>)
                </span>
              </div>
              <div className="guide-shortcut-row">
                <div className="guide-kbd-group">
                  <kbd className="guide-kbd">Enter</kbd>
                  <span>/</span>
                  <kbd className="guide-kbd">Esc</kbd>
                </div>
                <span className="guide-status-desc">
                  그룹 이름 인라인 수정 중 저장(<kbd className="guide-kbd">Enter</kbd>) 또는 취소(<kbd className="guide-kbd">Esc</kbd>)
                </span>
              </div>
              <div className="guide-shortcut-row">
                <div className="guide-kbd-group">
                  <kbd className="guide-kbd">하단 탭바</kbd>
                </div>
                <span className="guide-status-desc">
                  모바일 화면 하단에서 그룹 · 목록 · 편집 패널을 한 손으로 즉시 전환
                </span>
              </div>
              <div className="guide-shortcut-row">
                <div className="guide-kbd-group">
                  <kbd className="guide-kbd">≡ 길게 터치</kbd>
                </div>
                <span className="guide-status-desc">
                  모바일에서 드래그 핸들(≡)을 가볍게 누른 뒤 위아래로 끌어 그룹·노트 순서 변경
                </span>
              </div>
            </div>
          </article>
        </section>

        <footer className="guide-footer">
          <div className="guide-footer__copy">
            <strong>지금 바로 기록을 시작해 보세요</strong>
            <p>
              {isAuthenticated
                ? "작업 공간으로 돌아가 작성 중이던 노트를 이어서 편집할 수 있습니다."
                : "계정에 로그인하거나 새 계정을 만들어 나만의 노트 공간을 시작하세요."}
            </p>
          </div>
          <SpaLink to={destinationPath} className="guide-primary-cta">
            {isAuthenticated ? "작업 공간으로 돌아가 바로 작성하기" : "로그인 / 회원가입하러 가기"}
          </SpaLink>
        </footer>
      </div>
    </main>
  );
}

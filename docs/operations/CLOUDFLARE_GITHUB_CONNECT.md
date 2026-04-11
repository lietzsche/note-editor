# CLOUDFLARE_GITHUB_CONNECT.md

- 문서 버전: v1.0
- 작성일: 2026-04-11
- 목적: 소스 준비 전 단계에서 Cloudflare Pages 대시보드의 GitHub 연동 설정을 보류 상태로 기록

## 1. 현재 판단

1. 본 저장소의 기준 배포 경로는 `Cloudflare Pages + Pages Functions`이다.
2. 현재 저장소에는 실행 가능한 소스와 배포 설정이 아직 없다.
3. 따라서 지금 단계의 목표는 `GitHub 연동 기준 정리`이며, 실제 빌드/배포 성공은 후속 작업으로 미룬다.

## 2. 지금 저장해둘 결정

1. Pages 프로젝트와 GitHub 저장소 연결은 필요 시 지금 진행할 수 있다.
2. `Build command`는 후속 작업에서 확정한다.
3. `Build output directory`는 후속 작업에서 확정한다.
4. `Root directory`는 모노레포 구조가 확정되기 전까지 기본값을 유지한다.
5. 실제 첫 배포 성공 여부는 현재 단계의 완료 조건으로 잡지 않는다.

## 3. 나중에 수정 가능한 항목

Cloudflare Pages 대시보드의 빌드 설정은 이후 수정 가능하다.

- `Build command`
- `Build output directory`
- `Root directory`
- Production branch / Preview branch 제어

원칙:
- 설정 변경값은 저장 이후 실행되는 다음 빌드부터 적용한다.
- 추후 저장소에 실제 스크립트가 추가되면 대시보드 값도 그에 맞게 함께 변경한다.
- Pages Git 연동 프로젝트는 이후 `Direct Upload 전용 프로젝트`로 전환할 수 없으므로, 연동 생성 시점을 의도적으로 선택한다.

## 4. 현재 권장 절차

1. `Workers & Pages`로 이동한다.
2. `Create application`을 선택한다.
3. `Pages` 탭에서 `Import an existing Git repository`를 선택한다.
4. GitHub 권한을 승인한다.
5. 대상 저장소를 선택한다.
6. Production branch를 지정한다.
7. 아래 값은 현재 기준으로 유지한다.
- `Build command`: 후속 작업 전까지 임시값 또는 공란 정책 검토
- `Build output directory`: 실제 산출물 경로 확정 전까지 보류
- `Root directory`: 기본값 유지
8. 저장 후 연결 상태만 확보한다.

주의:
- 화면이 `Save and Deploy`를 강제하면 첫 빌드가 실패할 수 있다.
- 현재 저장소에는 `package.json`, 실제 앱 소스, 빌드 산출 경로가 없으므로 성공 배포를 기대하지 않는다.
- 목표가 `연동만 먼저`라면, 실패 로그를 남겨두고 후속 작업에서 다시 설정한다.
- 자동 배포를 원하지 않으면 `Settings > Builds > Branch control`에서 Production/Preview 자동 배포를 끌 수 있다.

## 5. 후속 작업 시점에 확정할 항목

1. 프로젝트 유형
- 정적 프론트엔드
- 프론트엔드 + Pages Functions 혼합 구조

2. 실제 배포 설정
- `Build command` 예시: `npm run build`
- `Build output directory` 예시: `build`
- `Root directory` 예시: 앱 루트 또는 워크스페이스 하위 경로

3. 리포지토리 설정 파일
- `package.json`
- `wrangler.toml` 또는 `wrangler.jsonc`

4. Pages 프로젝트 정합성
- Pages 프로젝트명은 `<NEW_PAGES_PROJECT_NAME>` 기준으로 관리한다.
- D1 및 Pages Functions 설정은 `docs/specs/SPEC-01-cloudflare-project-bootstrap.md`와 `docs/operations/DEPLOY.md`를 따른다.

## 6. 후속 작업 체크리스트

- [ ] 실행 가능한 앱 소스 추가
- [ ] `package.json` 추가
- [ ] `wrangler.toml` 또는 `wrangler.jsonc` 추가
- [ ] 실제 `Build command` 확정
- [ ] 실제 `Build output directory` 확정
- [ ] 필요 시 `Root directory` 지정
- [ ] 필요 시 자동 배포 브랜치 제어 설정
- [ ] 첫 정상 배포 재실행
- [ ] 배포 성공 후 `docs/operations/DEPLOY.md` 기준 검증 수행

## 7. 참고 문서

- Cloudflare Pages Git integration: <https://developers.cloudflare.com/pages/configuration/git-integration/>
- Cloudflare Pages build configuration: <https://developers.cloudflare.com/pages/configuration/build-configuration/>
- Cloudflare Pages Git integration guide: <https://developers.cloudflare.com/pages/get-started/git-integration/>

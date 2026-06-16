.PHONY: init up down restart logs smoke tag-search-static-smoke import-audit import-mvp-batch approve-mvp-batch heic-derivatives polish-mvp-ui lm-photos-zip-inventory lm-photos-stream-run lm-photos-run-report video-manifest export-metadata backup restore-test launch-readiness live-dam-surface-guard api-identity-guard api-audit-guard api-payload-guard private-source-guard public-env-guard git-hygiene-guard storage-honesty-guard frontend-dev frontend-check demo-check portal-api-smoke portal-sso-smoke portal-usage-smoke portal-delivery-smoke portal-download-ticket-smoke portal-writeback-guard-smoke portal-package-smoke portal-saved-search-smoke portal-feedback-smoke portal-redaction-crawler portal-beta-rehearsal portal-hosted-smoke portal-browser-qa

IMPORT_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024
LM_PHOTOS_ZIP_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo
VIDEO_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo

init:
	./scripts/bootstrap-official-docker.sh

up: init
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=100

smoke:
	./scripts/smoke.sh

tag-search-static-smoke:
	./scripts/tag-search-static-smoke.mjs

import-audit:
	./scripts/import-audit.sh "$(IMPORT_DIR)"

import-mvp-batch:
	./scripts/import-mvp-batch.sh "$(IMPORT_DIR)"

approve-mvp-batch:
	./scripts/approve-mvp-batch.sh

heic-derivatives:
	./scripts/heic-derivatives.sh "$(IMPORT_DIR)"

polish-mvp-ui:
	./scripts/polish-mvp-ui.sh

lm-photos-zip-inventory:
	./scripts/lm-photos-zip-inventory.sh "$(LM_PHOTOS_ZIP_DIR)"

lm-photos-stream-run:
	./scripts/lm-photos-stream-run.sh "$(LM_PHOTOS_ZIP_DIR)"

lm-photos-run-report:
	./scripts/generate-run-report.py

video-manifest:
	./scripts/video-manifest.sh "$(VIDEO_DIR)"

export-metadata:
	./scripts/export-metadata.sh

backup:
	./scripts/backup.sh

restore-test:
	./scripts/restore-test.sh

launch-readiness:
	./scripts/launch-readiness.sh

live-dam-surface-guard:
	./scripts/live-dam-surface-guard.mjs

api-identity-guard:
	./scripts/api-identity-guard.mjs

api-audit-guard:
	./scripts/api-audit-guard.mjs

api-payload-guard:
	./scripts/api-payload-guard.mjs

private-source-guard:
	./scripts/private-source-guard.mjs

public-env-guard:
	./scripts/public-env-guard.mjs

git-hygiene-guard:
	./scripts/git-hygiene-guard.mjs

storage-honesty-guard:
	./scripts/storage-honesty-guard.mjs

frontend-dev:
	cd frontend && npm run dev

frontend-check:
	./scripts/frontend-check.sh

demo-check:
	./scripts/demo-check.sh

portal-api-smoke:
	./scripts/portal-api-smoke.sh

portal-sso-smoke:
	./scripts/portal-sso-smoke.sh

portal-usage-smoke:
	./scripts/portal-usage-smoke.sh

portal-delivery-smoke:
	./scripts/portal-delivery-smoke.sh

portal-download-ticket-smoke:
	./scripts/portal-download-ticket-smoke.sh

portal-writeback-guard-smoke:
	./scripts/portal-writeback-guard-smoke.sh

portal-package-smoke:
	./scripts/portal-package-smoke.sh

portal-saved-search-smoke:
	./scripts/portal-saved-search-smoke.sh

portal-feedback-smoke:
	./scripts/portal-feedback-smoke.sh

portal-redaction-crawler:
	node scripts/normal-role-redaction-crawler.mjs

portal-beta-rehearsal:
	./scripts/portal-beta-rehearsal.sh

portal-hosted-smoke:
	./scripts/portal-hosted-smoke.sh

portal-browser-qa:
	./scripts/portal-browser-qa.mjs

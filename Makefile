.PHONY: init up down restart logs smoke tag-search-static-smoke import-audit import-mvp-batch approve-mvp-batch heic-derivatives polish-mvp-ui lm-photos-zip-inventory lm-photos-stream-run lm-photos-run-report video-manifest export-metadata backup restore-test launch-readiness slim-hygiene core-four-smoke live-dam-surface-guard live-dam-surface-guard-test api-identity-guard api-identity-guard-test api-audit-guard api-audit-guard-test api-payload-guard api-payload-guard-test private-source-guard private-source-guard-test public-env-guard public-env-guard-test git-hygiene-guard git-hygiene-guard-test storage-honesty-guard storage-honesty-guard-test ui-maturity-guard ui-maturity-guard-test completion-audit-guard completion-audit-guard-test safe-lane-guard safe-lane-guard-test runtime-isolation-guard runtime-isolation-guard-test safe-lane-disk-report safe-lane-disk-report-test safe-lane-headroom-guard safe-lane-headroom-guard-test dev-server-build-guard dev-server-build-guard-test hosted-readonly-probe-guard hosted-readonly-probe-guard-test hosted-smoke-mutation-guard hosted-smoke-mutation-guard-test open-blockers-guard open-blockers-guard-test small-team-beta-readiness-guard small-team-beta-readiness-guard-test evidence-packet-guard evidence-packet-guard-test external-proof-contract-guard external-proof-contract-guard-test team-beta-signoff-guard team-beta-signoff-guard-test portal-browser-qa-with-server-test portal-writeback-guard-smoke-test portal-download-ticket-smoke-test portal-sso-smoke-test portal-delivery-smoke-test portal-package-smoke-test frontend-dev frontend-check demo-check portal-api-smoke portal-sso-smoke portal-usage-smoke portal-delivery-smoke portal-download-ticket-smoke portal-writeback-guard-smoke portal-package-smoke portal-saved-search-smoke portal-feedback-smoke portal-beta-rehearsal portal-hosted-readonly-probe portal-hosted-smoke portal-browser-qa
.PHONY: photo-only-resourcespace-readiness portal-redaction-crawler

IMPORT_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024
LM_PHOTOS_ZIP_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo
VIDEO_DIR ?= /Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo

init:
	./scripts/bootstrap-official-docker.sh

up: init
	SAFE_LANE_HEADROOM_CONTEXT=docker-up node scripts/safe-lane-headroom-guard.mjs
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=100

smoke:
	SAFE_LANE_HEADROOM_CONTEXT=resourcespace-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/smoke.sh

tag-search-static-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=tag-search-static-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/tag-search-static-smoke.mjs

import-audit:
	SAFE_LANE_HEADROOM_CONTEXT=import-audit node scripts/safe-lane-headroom-guard.mjs
	./scripts/import-audit.sh "$(IMPORT_DIR)"

import-mvp-batch:
	SAFE_LANE_HEADROOM_CONTEXT=import-mvp-batch node scripts/safe-lane-headroom-guard.mjs
	./scripts/import-mvp-batch.sh "$(IMPORT_DIR)"

approve-mvp-batch:
	SAFE_LANE_HEADROOM_CONTEXT=approve-mvp-batch node scripts/safe-lane-headroom-guard.mjs
	./scripts/approve-mvp-batch.sh

heic-derivatives:
	SAFE_LANE_HEADROOM_CONTEXT=heic-derivatives node scripts/safe-lane-headroom-guard.mjs
	./scripts/heic-derivatives.sh "$(IMPORT_DIR)"

polish-mvp-ui:
	SAFE_LANE_HEADROOM_CONTEXT=polish-mvp-ui node scripts/safe-lane-headroom-guard.mjs
	./scripts/polish-mvp-ui.sh

lm-photos-zip-inventory:
	SAFE_LANE_HEADROOM_CONTEXT=lm-photos-zip-inventory node scripts/safe-lane-headroom-guard.mjs
	./scripts/lm-photos-zip-inventory.sh "$(LM_PHOTOS_ZIP_DIR)"

lm-photos-stream-run:
	SAFE_LANE_HEADROOM_CONTEXT=lm-photos-stream-run node scripts/safe-lane-headroom-guard.mjs
	./scripts/lm-photos-stream-run.sh "$(LM_PHOTOS_ZIP_DIR)"

lm-photos-run-report:
	SAFE_LANE_HEADROOM_CONTEXT=lm-photos-run-report node scripts/safe-lane-headroom-guard.mjs
	./scripts/generate-run-report.py

video-manifest:
	SAFE_LANE_HEADROOM_CONTEXT=video-manifest node scripts/safe-lane-headroom-guard.mjs
	./scripts/video-manifest.sh "$(VIDEO_DIR)"

export-metadata:
	SAFE_LANE_HEADROOM_CONTEXT=export-metadata node scripts/safe-lane-headroom-guard.mjs
	./scripts/export-metadata.sh

backup:
	SAFE_LANE_HEADROOM_CONTEXT=backup node scripts/safe-lane-headroom-guard.mjs
	./scripts/backup.sh

restore-test:
	SAFE_LANE_HEADROOM_CONTEXT=restore-test node scripts/safe-lane-headroom-guard.mjs
	./scripts/restore-test.sh

launch-readiness:
	./scripts/launch-readiness.sh

slim-hygiene:
	node scripts/live-dam-surface-guard.mjs
	node scripts/api-identity-guard.mjs
	node scripts/api-audit-guard.mjs
	node scripts/api-payload-guard.mjs
	node scripts/private-source-guard.mjs
	node scripts/public-env-guard.mjs
	node scripts/git-hygiene-guard.mjs

core-four-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=core-four-smoke node scripts/safe-lane-headroom-guard.mjs
	PORTAL_BROWSER_QA_SERVER_MODE=dev node scripts/portal-browser-qa-with-server.mjs

photo-only-resourcespace-readiness:
	node scripts/photo-only-resourcespace-readiness.mjs

live-dam-surface-guard:
	./scripts/live-dam-surface-guard.mjs

live-dam-surface-guard-test:
	node scripts/live-dam-surface-guard-test.mjs

api-identity-guard:
	./scripts/api-identity-guard.mjs

api-identity-guard-test:
	node scripts/api-identity-guard-test.mjs

api-audit-guard:
	./scripts/api-audit-guard.mjs

api-audit-guard-test:
	node scripts/api-audit-guard-test.mjs

api-payload-guard:
	./scripts/api-payload-guard.mjs

api-payload-guard-test:
	node scripts/api-payload-guard-test.mjs

private-source-guard:
	./scripts/private-source-guard.mjs

private-source-guard-test:
	node scripts/private-source-guard-test.mjs

public-env-guard:
	./scripts/public-env-guard.mjs

public-env-guard-test:
	node scripts/public-env-guard-test.mjs

git-hygiene-guard:
	./scripts/git-hygiene-guard.mjs

git-hygiene-guard-test:
	node scripts/git-hygiene-guard-test.mjs

storage-honesty-guard:
	./scripts/storage-honesty-guard.mjs

storage-honesty-guard-test:
	node scripts/storage-honesty-guard-test.mjs

ui-maturity-guard:
	node scripts/ui-maturity-guard.mjs

ui-maturity-guard-test:
	node scripts/ui-maturity-guard-test.mjs

completion-audit-guard:
	node scripts/completion-audit-guard.mjs

completion-audit-guard-test:
	node scripts/completion-audit-guard-test.mjs

safe-lane-guard:
	./scripts/safe-lane-guard.mjs

safe-lane-guard-test:
	node scripts/safe-lane-guard-test.mjs

runtime-isolation-guard:
	./scripts/runtime-isolation-guard.mjs

runtime-isolation-guard-test:
	node scripts/runtime-isolation-guard-test.mjs

safe-lane-disk-report:
	node scripts/safe-lane-disk-report.mjs

safe-lane-disk-report-test:
	node scripts/safe-lane-disk-report-test.mjs

safe-lane-headroom-guard:
	node scripts/safe-lane-headroom-guard.mjs

safe-lane-headroom-guard-test:
	node scripts/safe-lane-headroom-guard-test.mjs

dev-server-build-guard:
	node scripts/dev-server-build-guard.mjs

dev-server-build-guard-test:
	node scripts/dev-server-build-guard-test.mjs

hosted-readonly-probe-guard:
	./scripts/hosted-readonly-probe-guard.mjs

hosted-readonly-probe-guard-test:
	node scripts/hosted-readonly-probe-guard-test.mjs

hosted-smoke-mutation-guard:
	./scripts/hosted-smoke-mutation-guard.mjs

hosted-smoke-mutation-guard-test:
	node scripts/hosted-smoke-mutation-guard-test.mjs

open-blockers-guard:
	node scripts/open-blockers-guard.mjs

open-blockers-guard-test:
	node scripts/open-blockers-guard-test.mjs

small-team-beta-readiness-guard:
	./scripts/small-team-beta-readiness-guard.mjs

small-team-beta-readiness-guard-test:
	node scripts/small-team-beta-readiness-guard-test.mjs

evidence-packet-guard:
	./scripts/evidence-packet-guard.mjs

evidence-packet-guard-test:
	node scripts/evidence-packet-guard-test.mjs

external-proof-contract-guard:
	node scripts/external-proof-contract-guard.mjs

external-proof-contract-guard-test:
	node scripts/external-proof-contract-guard-test.mjs

team-beta-signoff-guard:
	node scripts/team-beta-signoff-guard.mjs

team-beta-signoff-guard-test:
	node scripts/team-beta-signoff-guard-test.mjs

portal-browser-qa-with-server-test:
	node scripts/portal-browser-qa-with-server-test.mjs

portal-writeback-guard-smoke-test:
	node scripts/portal-writeback-guard-smoke-test.mjs

portal-download-ticket-smoke-test:
	node scripts/portal-download-ticket-smoke-test.mjs

portal-sso-smoke-test:
	node scripts/portal-sso-smoke-test.mjs

portal-delivery-smoke-test:
	node scripts/portal-delivery-smoke-test.mjs

portal-package-smoke-test:
	node scripts/portal-package-smoke-test.mjs

frontend-dev:
	SAFE_LANE_HEADROOM_CONTEXT=frontend-dev node scripts/safe-lane-headroom-guard.mjs
	cd frontend && npm run dev

frontend-check:
	SAFE_LANE_HEADROOM_CONTEXT=frontend-check node scripts/safe-lane-headroom-guard.mjs
	./scripts/frontend-check.sh

demo-check:
	SAFE_LANE_HEADROOM_CONTEXT=demo-check node scripts/safe-lane-headroom-guard.mjs
	./scripts/demo-check.sh

portal-api-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-api-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-api-smoke.sh

portal-sso-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-sso-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-sso-smoke.sh

portal-usage-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-usage-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-usage-smoke.sh

portal-delivery-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-delivery-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-delivery-smoke.sh

portal-download-ticket-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-download-ticket-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-download-ticket-smoke.sh

portal-writeback-guard-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-writeback-guard-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-writeback-guard-smoke.sh

portal-package-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-package-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-package-smoke.sh

portal-saved-search-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-saved-search-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-saved-search-smoke.sh

portal-feedback-smoke:
	SAFE_LANE_HEADROOM_CONTEXT=portal-feedback-smoke node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-feedback-smoke.sh

portal-redaction-crawler:
	node scripts/normal-role-redaction-crawler.mjs

portal-beta-rehearsal:
	SAFE_LANE_HEADROOM_CONTEXT=portal-beta-rehearsal node scripts/safe-lane-headroom-guard.mjs
	./scripts/portal-beta-rehearsal.sh

portal-hosted-readonly-probe:
	SAFE_LANE_HEADROOM_CONTEXT=portal-hosted-readonly-probe node scripts/safe-lane-headroom-guard.mjs
	node scripts/portal-hosted-readonly-probe.mjs

portal-hosted-smoke:
	./scripts/portal-hosted-smoke.sh

portal-browser-qa:
	SAFE_LANE_HEADROOM_CONTEXT=portal-browser-qa node scripts/safe-lane-headroom-guard.mjs
	node scripts/portal-browser-qa-with-server.mjs

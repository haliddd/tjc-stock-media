# Backup Restore Runbook

## Local Commands

Create backup:

```bash
make backup
```

Test restore:

```bash
make restore-test
```

## Rule

A backup only counts after restore has been tested on a clean target.

## Production Requirement

Before church launch:

- backup target must be separate from primary storage
- restore test must pass on church PC/NAS
- backup schedule must be owned by church IT/admin
- local prototype machine must be optional, not production dependency

## Restore Evidence

Record restore evidence without secrets:

- restore date
- backup artifact names
- database dump present
- ResourceSpace filestore/config present
- metadata exports/manifests present
- admin login works
- sample photo searchable in ResourceSpace
- sample preview derivative displays
- blocked or Needs Review asset remains blocked
- portal still hides source/original/private paths from Viewer/Contributor
- ResourceSpace writeback remains queued/disabled unless a separately approved live test proves otherwise

Do not commit database dumps, filestore files, runtime backups, `.env`, credentials, private exports, or media files.

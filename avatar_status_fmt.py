"""Formats the GET /v1/avatars response piped in by avatar-status.sh (body, newline, HTTP status)."""
import json
import sys

MEANING = {
    "ACTIVE": "ready to use",
    "DEPLOYING": "still processing",
    "INIT": "queued / just started",
    "FAILED": "FAILED",
    "DEACTIVATED": "deactivated",
    "DELETED": "deleted",
}

raw = sys.stdin.read()
body, _, status = raw.rpartition("\n")
if status != "200":
    print("HTTP " + status + ": " + body[:300])
    sys.exit(1)

resp = json.loads(body)
data = resp.get("data") or {}
avatars = data.get("results") or []
print("%s avatar(s) on this account\n" % data.get("count", len(avatars)))
for a in avatars:
    st = a.get("status")
    print("- %s  [%s, %s]" % (a.get("name"), a.get("type"), "1080p" if a.get("is_1080p") else "720p"))
    print("    status:  %s  (%s)" % (st, MEANING.get(st, st)))
    print("    created: %s   updated: %s" % (a.get("created_at"), a.get("updated_at")))
    if a.get("is_expired"):
        print("    expired: yes")
    if a.get("error_message"):
        print("    error:   %s" % a.get("error_message"))
    print("    id:      %s" % a.get("id"))

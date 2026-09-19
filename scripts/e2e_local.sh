#!/usr/bin/env bash
# Local end-to-end smoke test for the content + auto-curation flow.
# Requires: backend running on $API_BASE (default http://localhost:8080), jq, curl,
# and an admin user seeded via scripts/seed_dev_admin.py.
#
# Without YOUTUBE_API_KEY configured this verifies graceful degradation:
# uncovered lessons are reported instead of auto-filled.
set -uo pipefail

API_BASE="${API_BASE:-http://localhost:8080}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@profy.test}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin-dev-password}"

pass=0
fail=0
step() { echo; echo "== $1 =="; }
check() { # check <desc> <expr>
  if eval "$2"; then echo "  ✅ $1"; pass=$((pass+1)); else echo "  ❌ $1"; fail=$((fail+1)); fi
}

slug="e2e-course-$(date +%s)"
lesson_slug="e2e-lesson-$(date +%s)"

step "1. Health"
health=$(curl -sf "$API_BASE/healthz" || echo FAIL)
check "healthz responds" '[ "$health" != "FAIL" ] && [ -n "$health" ]'

step "2. Admin login"
login=$(curl -sf -X POST "$API_BASE/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || echo FAIL)
token=$(echo "$login" | jq -r '.accessToken // empty')
check "login returns access token" '[ -n "$token" ]'
AUTH="Authorization: Bearer $token"

step "3. Create course taxonomy node"
course=$(curl -sf -X POST "$API_BASE/api/v1/admin/taxonomy" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"nodeType\":\"course\",\"name\":\"E2E Course\",\"slug\":\"$slug\",\"phase\":1}" || echo FAIL)
course_id=$(echo "$course" | jq -r '.id // empty')
check "course created" '[ -n "$course_id" ]'

step "4. Create + publish lesson (no video)"
lesson=$(curl -sf -X POST "$API_BASE/api/v1/admin/lessons" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"nodeId\":\"$course_id\",\"title\":\"E2E Lesson\",\"slug\":\"$lesson_slug\",\"status\":\"published\",\"level\":\"beginner\"}" || echo FAIL)
lesson_id=$(echo "$lesson" | jq -r '.id // empty')
check "lesson created" '[ -n "$lesson_id" ]'

step "5. Consumer lesson read — graceful degradation without YOUTUBE_API_KEY"
consumer=$(curl -sf "$API_BASE/api/v1/lessons/$lesson_slug" || echo FAIL)
primary_source=$(echo "$consumer" | jq -r '.primaryVideo.source // empty')
check "lesson served (200, no auto video, no error)" \
  'echo "$consumer" | jq -e ".id and (.primaryVideo == null)" >/dev/null'

step "6. Coverage report shows the uncovered lesson"
uncovered=$(curl -sf "$API_BASE/api/v1/admin/report/uncovered-lessons" -H "$AUTH" || echo FAIL)
check "lesson appears in uncovered-lessons report" \
  'echo "$uncovered" | jq -e --arg id "$lesson_id" "any(.[]; .id == \$id)" >/dev/null'

step "7. Review queue is empty for fresh lesson"
queue=$(curl -sf "$API_BASE/api/v1/admin/review/videos" -H "$AUTH" || echo FAIL)
check "review queue does not contain the fresh lesson" \
  '! echo "$queue" | jq -e --arg id "$lesson_id" "any(.[]; .lessonId == \$id)" >/dev/null'

step "8. Attach curated video → becomes primary"
vid=$(curl -sf -X POST "$API_BASE/api/v1/admin/lessons/$lesson_id/videos" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"youtubeVideoId":"dQw4w9WgXcQ","title":"E2E Curated Video","channel":"Dera Skul","curatorStatus":"approved","isPrimary":true}' || echo FAIL)
video_id=$(echo "$vid" | jq -r '.id // empty')
check "video attached" '[ -n "$video_id" ]'
after=$(curl -sf "$API_BASE/api/v1/lessons/$lesson_slug" || echo FAIL)
check "curated video now primary" \
  'echo "$after" | jq -e ".primaryVideo != null and .primaryVideo.source == \"curated\"" >/dev/null'

step "9. Flag the video → review queue"
curl -sf -X PUT "$API_BASE/api/v1/admin/videos/$video_id" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"curatorStatus":"flagged"}' >/dev/null
queue2=$(curl -sf "$API_BASE/api/v1/admin/review/videos" -H "$AUTH" || echo FAIL)
check "flagged video in queue with lessonTitle" \
  'echo "$queue2" | jq -e --arg id "$video_id" "any(.[]; .id == \$id and .lessonTitle != null)" >/dev/null'

step "10. Consumer course endpoint"
course_payload=$(curl -sf "$API_BASE/api/v1/courses/$slug" || echo FAIL)
check "course served with the published lesson" \
  'echo "$course_payload" | jq -e --arg s "$lesson_slug" "any(.lessons[]; .slug == \$s)" >/dev/null'

echo
echo "================================"
echo "E2E RESULT: $pass passed, $fail failed"
echo "Seeded data left in place: course '$slug' (id=$course_id)"
[ "$fail" -eq 0 ]

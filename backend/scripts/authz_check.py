import os
import secrets
import sys
import time
from datetime import datetime, timezone

import httpx

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000")
results: list[tuple[str, str, str]] = []
created_emails: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, "PASS" if ok else "FAIL", detail))


def skip(name: str, detail: str) -> None:
    results.append((name, "SKIPPED", detail))


def detail_of(response: httpx.Response) -> str:
    try:
        detail = response.json().get("detail")
    except Exception:
        detail = response.text[:200]
    return str(detail)


def step_failed(step: str, response: httpx.Response) -> None:
    print(f"  setup step '{step}' failed: HTTP {response.status_code} - {detail_of(response)}")


def login(client: httpx.Client, email: str, password: str) -> str | None:
    response = client.post("/auth/login", data={"username": email, "password": password})
    if response.status_code != 200:
        step_failed("login", response)
        return None
    return response.json()["access_token"]


def sample_answers(form: dict | None) -> dict:
    answers: dict = {}
    for field in (form or {}).get("fields", []):
        kind = field["type"]
        if kind == "checkbox":
            answers[field["key"]] = True
        elif kind == "number":
            answers[field["key"]] = 1
        elif kind == "dropdown":
            answers[field["key"]] = field["options"][0]
        else:
            answers[field["key"]] = "zz_test"
    return answers


def find_free_open_session(client: httpx.Client, headers: dict) -> tuple[int, dict | None] | None:
    response = client.get("/events", headers=headers)
    if response.status_code != 200:
        step_failed("list events", response)
        return None
    now = datetime.now(timezone.utc)
    for event in response.json():
        if event.get("status") != "PUBLISHED" or float(event.get("fee_amount") or 0) != 0:
            continue
        deadline = event.get("registration_deadline")
        if deadline and datetime.fromisoformat(deadline.replace("Z", "+00:00")) < now:
            continue
        sessions = client.get(f"/events/{event['id']}/sessions", headers=headers)
        if sessions.status_code != 200:
            step_failed(f"list sessions of event {event['id']}", sessions)
            continue
        form = None
        if event.get("has_form"):
            form_response = client.get(f"/events/{event['id']}/form", headers=headers)
            if form_response.status_code != 200:
                step_failed(f"get form of event {event['id']}", form_response)
                continue
            form = form_response.json().get("form")
        for session in sessions.json():
            capacity = session.get("capacity") or event.get("capacity")
            if capacity and session.get("registered_count", 0) >= capacity:
                continue
            return session["id"], form
    return None


def signup_throwaway(client: httpx.Client, email: str, password: str) -> bool:
    body = {"full_name": "Zz Test Student", "primary_email": email, "password": password}
    for attempt in range(2):
        response = client.post("/auth/signup", json=body)
        if response.status_code == 201:
            return True
        if response.status_code == 429 and attempt == 0:
            print("  signup rate-limited, waiting 61 seconds...")
            time.sleep(61)
            continue
        step_failed("signup", response)
        return False
    return False


def create_victim_registration(client: httpx.Client, admin: dict) -> tuple[int | None, str | None]:
    picked = find_free_open_session(client, admin)
    if picked is None:
        print("no free open event available, create one")
        return None, "no free open event available, create one"
    session_id, form = picked

    email = f"zz_test_{secrets.token_hex(4)}@test.com"
    password = "Zz-Test-" + secrets.token_urlsafe(12)
    print(f"  throwaway student: {email}")
    created_emails.append(email)
    if not signup_throwaway(client, email, password):
        return None, ""
    token = login(client, email, password)
    if not token:
        return None, ""
    headers = {"Authorization": f"Bearer {token}"}
    roll = "".join(secrets.choice("0123456789") for _ in range(11))
    profile = client.patch("/auth/me", headers=headers, json={"phone": "03001234567", "roll_number": roll})
    if profile.status_code != 200:
        step_failed("profile update", profile)
    response = client.post(
        f"/registrations/sessions/{session_id}", headers=headers, json={"answers": sample_answers(form)}
    )
    if response.status_code != 201:
        step_failed(f"register for session {session_id}", response)
        return None, ""
    return response.json()["id"], None


def main() -> int:
    creds = {k: os.environ.get(k) for k in ("ADMIN_EMAIL", "ADMIN_PASSWORD", "STUDENT_EMAIL", "STUDENT_PASSWORD")}
    missing = [k for k, v in creds.items() if not v]
    if missing:
        print("Missing environment variables: " + ", ".join(missing))
        return 2

    with httpx.Client(base_url=BASE, timeout=15) as client:
        admin_token = login(client, creds["ADMIN_EMAIL"], creds["ADMIN_PASSWORD"])
        student_token = login(client, creds["STUDENT_EMAIL"], creds["STUDENT_PASSWORD"])
        if not admin_token or not student_token:
            print("Admin or student login failed.")
            return 2
        admin = {"Authorization": f"Bearer {admin_token}"}
        student = {"Authorization": f"Bearer {student_token}"}

        for path in ("/registrations/me", "/users", "/certificates/me"):
            code = client.get(path).status_code
            check(f"no token GET {path} -> 401", code == 401, str(code))

        events = client.get("/events", headers=admin).json()
        event_id = events[0]["id"] if events else None
        student_attempts = [
            ("GET", "/users", None),
            ("POST", "/events", {}),
            ("PATCH", "/registrations/1/attendance", {"attended": True}),
        ]
        if event_id is not None:
            student_attempts.append(("POST", f"/events/{event_id}/certificates/issue", {}))
        for method, path, body in student_attempts:
            code = client.request(method, path, headers=student, json=body).status_code
            check(f"student {method} {path} -> 403", code == 403, str(code))

        victim_reg_id, skip_reason = create_victim_registration(client, admin)
        if victim_reg_id is None and skip_reason:
            skip("second student registration setup", skip_reason)
        elif victim_reg_id is None:
            check("second student registration setup", False, "see failed setup step above")
        else:
            targets = [
                ("GET", f"/registrations/{victim_reg_id}", None, None),
                ("GET", f"/registrations/{victim_reg_id}/receipt", None, None),
                ("POST", f"/registrations/{victim_reg_id}/cancel", None, None),
                ("PATCH", f"/registrations/{victim_reg_id}/attendance", {"attended": True}, None),
                ("PUT", f"/registrations/{victim_reg_id}/answers", {"answers": {}}, None),
                ("POST", f"/registrations/{victim_reg_id}/receipt", None, {"file": ("zz_test.png", b"zz_test", "image/png")}),
                ("POST", f"/registrations/{victim_reg_id}/approve", None, None),
                ("POST", f"/registrations/{victim_reg_id}/reject", {"reason": "zz_test"}, None),
            ]
            for method, path, body, files in targets:
                kwargs = {"files": files} if files else {"json": body}
                code = client.request(method, path, headers=student, **kwargs).status_code
                check(f"student1 {method} {path} on student2's registration denied", code in (403, 404), str(code))

        me = client.get("/auth/me", headers=student)
        certs = client.get("/certificates/me", headers=student).json()
        if me.status_code == 200:
            uid = me.json()["id"]
            check("student /certificates/me only own", all(c["user_id"] == uid for c in certs), f"{len(certs)} certs")
        else:
            check("student /certificates/me only own", False, f"/auth/me returned {me.status_code}")

        codes = [
            client.post("/auth/login", data={"username": creds["STUDENT_EMAIL"], "password": "wrong-password-zz"}).status_code
            for _ in range(12)
        ]
        check("rapid wrong-password logins end in 429", codes[-1] == 429, str(codes))

    width = max(len(name) for name, _, _ in results)
    for name, status, detail in results:
        print(f"{status.ljust(7)}  {name.ljust(width)}  {detail}")
    for email in created_emails:
        print(f"Throwaway student left in database (delete later): {email}")
    return 0 if all(status != "FAIL" for _, status, _ in results) else 1


if __name__ == "__main__":
    sys.exit(main())

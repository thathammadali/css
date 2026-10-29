import os
import sys

import httpx

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000")
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))


def login(client: httpx.Client, email: str, password: str) -> str | None:
    response = client.post("/auth/login", data={"username": email, "password": password})
    if response.status_code != 200:
        return None
    return response.json()["access_token"]


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
        registrations = []
        for event in events:
            for session in event.get("sessions") or []:
                response = client.get(f"/registrations/sessions/{session['id']}/all", headers=admin)
                if response.status_code == 200:
                    registrations.extend(response.json())

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

        own_ids = {r["id"] for r in client.get("/registrations/me", headers=student).json()}
        foreign = [r for r in registrations if r["id"] not in own_ids]
        if foreign:
            reg_id = foreign[0]["id"]
            for path in (f"/registrations/{reg_id}", f"/registrations/{reg_id}/receipt"):
                code = client.get(path, headers=student).status_code
                check(f"student GET {path} denied", code in (403, 404), str(code))
        else:
            check("student cannot read another user's registration", False, "no other registration to test")

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
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")
    return 0 if all(ok for _, ok, _ in results) else 1


if __name__ == "__main__":
    sys.exit(main())

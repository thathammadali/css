import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session as DBSession

from database import get_db
from auth import get_current_user, require_roles
import models
import schemas
from payments import detect_file_type, MAX_SIZE  # reusing your existing byte-signature check

router = APIRouter(tags=["assignments"])

UPLOAD_DIR = "uploads/assignments"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_SUBMISSION_TYPES = {"pdf", "jpg", "png"}  # extend later if you want docx/zip etc.


@router.post("/sessions/{session_id}/assignments", response_model=schemas.AssignmentOut)
def create_assignment(
    session_id: int,
    payload: schemas.AssignmentCreate,
    db: DBSession = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "super_admin")),
):
    session_obj = db.query(models.EventSession).filter(models.EventSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    assignment = models.Assignment(
        session_id=session_id,
        title=payload.title,
        description=payload.description,
        deadline=payload.deadline,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/sessions/{session_id}/assignments", response_model=list[schemas.AssignmentOut])
def list_assignments(
    session_id: int,
    db: DBSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    session_obj = db.query(models.EventSession).filter(models.EventSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    if user.role.name not in ("admin", "super_admin"):
        registered = (
            db.query(models.Registration)
            .filter(
                models.Registration.session_id == session_id,
                models.Registration.user_id == user.id,
                models.Registration.status == "CONFIRMED",
            )
            .first()
        )
        if registered is None:
            raise HTTPException(
                status_code=403,
                detail="You must have a confirmed registration to view assignments.",
            )

    return db.query(models.Assignment).filter(models.Assignment.session_id == session_id).all()


@router.post("/assignments/{assignment_id}/submit", response_model=schemas.AssignmentSubmissionOut)
def submit_assignment(
    assignment_id: int,
    file: UploadFile = File(...),
    db: DBSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    registration = (
        db.query(models.Registration)
        .filter(
            models.Registration.session_id == assignment.session_id,
            models.Registration.user_id == user.id,
        )
        .first()
    )
    if not registration:
        raise HTTPException(status_code=403, detail="You are not registered for this session")
    if registration.status != "CONFIRMED":
        raise HTTPException(status_code=403, detail="Your registration must be confirmed to submit.")

    existing = (
        db.query(models.AssignmentSubmission)
        .filter(
            models.AssignmentSubmission.assignment_id == assignment_id,
            models.AssignmentSubmission.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted this assignment")

    contents = file.file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    detected_type = detect_file_type(contents)
    if detected_type not in ALLOWED_SUBMISSION_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    filename = f"assignment_{assignment_id}_user_{user.id}.{detected_type}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    is_late = datetime.now(timezone.utc) > assignment.deadline

    submission = models.AssignmentSubmission(
        assignment_id=assignment_id,
        user_id=user.id,
        file_path=file_path,
        is_late=is_late,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return schemas.AssignmentSubmissionOut(
        id=submission.id,
        assignment_id=submission.assignment_id,
        user_id=submission.user_id,
        user_full_name=user.full_name,
        user_primary_email=user.primary_email,
        is_late=submission.is_late,
        submitted_at=submission.submitted_at,
    )


@router.get("/assignments/submissions/{submission_id}/file")
def download_submission(
    submission_id: int,
    db: DBSession = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    submission = (
        db.query(models.AssignmentSubmission)
        .filter(models.AssignmentSubmission.id == submission_id)
        .first()
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    if user.role.name not in ("admin", "super_admin") and submission.user_id != user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this submission.")
    if not os.path.exists(submission.file_path):
        raise HTTPException(status_code=404, detail="Submission file is missing on the server.")
    return FileResponse(submission.file_path)


@router.get("/assignments/{assignment_id}/submissions", response_model=list[schemas.AssignmentSubmissionOut])
def list_submissions(
    assignment_id: int,
    db: DBSession = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "super_admin")),
):
    submissions = (
        db.query(models.AssignmentSubmission)
        .filter(models.AssignmentSubmission.assignment_id == assignment_id)
        .all()
    )
    return [
        schemas.AssignmentSubmissionOut(
            id=s.id,
            assignment_id=s.assignment_id,
            user_id=s.user_id,
            user_full_name=s.user.full_name,
            user_primary_email=s.user.primary_email,
            is_late=s.is_late,
            submitted_at=s.submitted_at,
        )
        for s in submissions
    ]

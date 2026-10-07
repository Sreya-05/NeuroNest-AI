import os
import sys
import shutil
import uuid

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db
from services.fusion_service import MultimodalFusionService
from services.config import check_dependencies, check_datasets_availability

app = FastAPI(title="NeuroNest AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

MODALITY_CONFIG = {
    "speech": {
        "upload_dir": os.path.join(UPLOADS_DIR, "speech"),
        "allowed": {".wav", ".mp3", ".m4a", ".ogg", ".webm"},
    },
    "handwriting": {
        "upload_dir": os.path.join(UPLOADS_DIR, "handwriting"),
        "allowed": {".png", ".jpg", ".jpeg", ".webp"},
    },
    "gait": {
        "upload_dir": os.path.join(UPLOADS_DIR, "gait"),
        "allowed": {".mp4", ".mov", ".webm", ".avi", ".mkv"},
    },
}

for config in MODALITY_CONFIG.values():
    os.makedirs(config["upload_dir"], exist_ok=True)

fusion_service = MultimodalFusionService()


@app.get("/health")
def health():
    return {"status": "NeuroNest AI backend is running"}


@app.get("/api/models/status")
def get_models_status():
    """
    Returns the real readiness status of the model architectures,
    checking on-disk weights and ML framework dependencies.
    """
    model_status = fusion_service.get_system_status()
    dependencies = check_dependencies()
    datasets = check_datasets_availability()

    return {
        "models": model_status,
        "dependencies": dependencies,
        "datasets": datasets,
    }


class MultimodalAnalysisRequest(BaseModel):
    speech_filename: str
    handwriting_filename: str
    gait_filename: str


@app.post("/api/analyze/multimodal")
def analyze_multimodal(req: MultimodalAnalysisRequest):
    """
    Endpoint for multimodal Parkinson's risk inference.
    Strictly verifies files and trained model weights.
    Does NOT output fake predictions or placeholder scores.
    """
    speech_path = os.path.join(MODALITY_CONFIG["speech"]["upload_dir"], req.speech_filename)
    handwriting_path = os.path.join(MODALITY_CONFIG["handwriting"]["upload_dir"], req.handwriting_filename)
    gait_path = os.path.join(MODALITY_CONFIG["gait"]["upload_dir"], req.gait_filename)

    # Validate file existence
    for modality, path in [("speech", speech_path), ("handwriting", handwriting_path), ("gait", gait_path)]:
        if not os.path.isfile(path):
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded {modality} file not found: {os.path.basename(path)}",
            )

    try:
        return fusion_service.run_multimodal_inference(speech_path, handwriting_path, gait_path)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/upload/speech")
async def upload_speech(file: UploadFile = File(...)):
    return _handle_upload("speech", file)


@app.post("/api/upload/handwriting")
async def upload_handwriting(file: UploadFile = File(...)):
    return _handle_upload("handwriting", file)


@app.post("/api/upload/gait")
async def upload_gait(file: UploadFile = File(...)):
    return _handle_upload("gait", file)


def _handle_upload(modality: str, file: UploadFile):
    config = MODALITY_CONFIG.get(modality)
    if not config:
        raise HTTPException(status_code=400, detail="Unknown modality")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in config["allowed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {modality}. Allowed: {', '.join(sorted(config['allowed']))}",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(config["upload_dir"], unique_name)

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "status": "success",
        "modality": modality,
        "original_filename": file.filename,
        "saved_filename": unique_name,
        "saved_path": save_path,
    }


# ==========================================
# Authentication & Access Control
# ==========================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str  # 'Patient' or 'Doctor'
    doctor_referral_code: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class SaveScreeningRequest(BaseModel):
    modalities: Dict[str, Any]
    combined_result: Dict[str, Any]
    feature_dimensions: Optional[Dict[str, Any]] = None


class AssociatePatientRequest(BaseModel):
    patient_email: str


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication token missing. Please sign in.")
    user = db.get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid token. Please sign in again.")
    return user


@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if req.role not in ("Patient", "Doctor"):
        raise HTTPException(status_code=400, detail="Role must be 'Patient' or 'Doctor'.")
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="A valid email is required.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    try:
        user = db.create_user(
            name=req.name,
            email=req.email,
            password=req.password,
            role=req.role,
            doctor_referral_code=req.doctor_referral_code,
        )
        token = db.create_session(user["id"])
        return {
            "status": "success",
            "token": token,
            "user": user,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = db.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email address or password.")
    token = db.create_session(user["id"])
    return {
        "status": "success",
        "token": token,
        "user": user,
    }


@app.get("/api/auth/me")
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "status": "success",
        "user": current_user,
    }


# ==========================================
# Patient Screening History (Persistent Storage)
# ==========================================

@app.post("/api/screenings")
def save_screening_endpoint(
    req: SaveScreeningRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user["role"] != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can save screening assessments.")

    # Validate that all 3 modalities are present
    modalities = req.modalities or {}
    if not all(k in modalities for k in ("speech", "handwriting", "gait")):
        raise HTTPException(
            status_code=400,
            detail="Incomplete assessment. All 3 modalities (speech, handwriting, gait) are required."
        )

    saved = db.save_screening(current_user, req.dict())
    return {
        "status": "success",
        "screening": saved,
    }


@app.get("/api/patient/screenings")
def get_patient_screening_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user["role"] != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can view patient screening history.")

    # Strictly retrieve only this patient's records
    history = db.get_patient_screenings(current_user["email"])
    return {
        "status": "success",
        "screenings": history,
    }


# ==========================================
# Doctor Patient Viewing & Management
# ==========================================

@app.get("/api/doctor/patients")
def get_doctor_patients_list(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")

    patients = db.get_doctor_patients(current_user["email"])
    return {
        "status": "success",
        "patients": patients,
    }


@app.get("/api/doctor/patients/{patient_email}/screenings")
def get_doctor_patient_screenings_endpoint(
    patient_email: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")

    screenings = db.get_doctor_patient_screenings(current_user["email"], patient_email)
    if screenings is None:
        raise HTTPException(
            status_code=403,
            detail="Access denied: Patient record is not associated with your doctor account.",
        )

    return {
        "status": "success",
        "patient_email": patient_email,
        "screenings": screenings,
    }


@app.post("/api/doctor/associate")
def associate_patient_endpoint(
    req: AssociatePatientRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")

    success = db.associate_patient_with_doctor(req.patient_email, current_user["email"])
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Patient '{req.patient_email}' not found or already assigned.",
        )

    return {
        "status": "success",
        "message": f"Patient '{req.patient_email}' is now associated with Dr. {current_user['name']}.",
    }


# ==========================================
# Doctor-Patient Appointments System
# ==========================================

class CreateAppointmentRequest(BaseModel):
    doctor_id: int
    appointment_date: str
    appointment_time: str
    reason: Optional[str] = None


class UpdateAppointmentStatusRequest(BaseModel):
    status: str  # 'accepted' or 'rejected'
    doctor_note: Optional[str] = None


@app.get("/api/doctors")
def get_doctors_list(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns real registered doctors from backend storage.
    """
    doctors = db.get_registered_doctors()
    return {
        "status": "success",
        "doctors": doctors,
    }


@app.post("/api/appointments")
def create_appointment_endpoint(
    req: CreateAppointmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Patient submits an appointment request with a selected registered doctor.
    """
    if current_user["role"] != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can request appointments.")

    if not req.appointment_date or not req.appointment_time:
        raise HTTPException(status_code=400, detail="Date and time are required for the appointment.")

    try:
        appt = db.create_appointment(
            patient_user=current_user,
            doctor_id=req.doctor_id,
            appointment_date=req.appointment_date,
            appointment_time=req.appointment_time,
            reason=req.reason,
        )
        return {
            "status": "success",
            "appointment": appt,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/patient/appointments")
def get_patient_appointments_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Patients can only view their own appointments.
    """
    if current_user["role"] != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can access patient appointments.")

    appts = db.get_patient_appointments(current_user["email"])
    return {
        "status": "success",
        "appointments": appts,
    }


@app.get("/api/doctor/appointments")
def get_doctor_appointments_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Doctors can only view appointments involving them.
    Each appointment includes the patient's latest screening status / model-indicated findings.
    """
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")

    appts = db.get_doctor_appointments(current_user["email"])
    return {
        "status": "success",
        "appointments": appts,
    }


@app.patch("/api/doctor/appointments/{appointment_id}/status")
def update_appointment_status_endpoint(
    appointment_id: int,
    req: UpdateAppointmentStatusRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Doctor accepts or rejects an incoming appointment request.
    """
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Doctor access required.")

    try:
        updated = db.update_appointment_status(
            appointment_id=appointment_id,
            doctor_email=current_user["email"],
            status=req.status,
            doctor_note=req.doctor_note,
        )
        if not updated:
            raise HTTPException(
                status_code=404,
                detail="Appointment request not found or not associated with your doctor account.",
            )

        return {
            "status": "success",
            "appointment": updated,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))



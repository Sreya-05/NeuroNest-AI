import sqlite3
import os
import json
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "neuro_nest.db")

def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    # Deterministic SHA-256 hash for authentication
    return hashlib.sha256(password.strip().encode("utf-8")).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Patient', 'Doctor')),
        doctor_email TEXT,
        referral_code TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Auth sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Multimodal screening history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS screenings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_email TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        speech_prediction TEXT NOT NULL,
        speech_confidence REAL NOT NULL,
        handwriting_prediction TEXT NOT NULL,
        handwriting_confidence REAL NOT NULL,
        gait_prediction TEXT NOT NULL,
        gait_confidence REAL NOT NULL,
        composite_prediction TEXT NOT NULL,
        composite_classification TEXT NOT NULL,
        risk_score REAL NOT NULL,
        confidence REAL NOT NULL,
        positive_modalities_count INTEGER NOT NULL,
        total_modalities_count INTEGER NOT NULL DEFAULT 3,
        modality_concordance TEXT NOT NULL,
        summary TEXT NOT NULL,
        raw_details_json TEXT NOT NULL
    );
    """)

    # 4. Doctor-patient appointments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        patient_name TEXT NOT NULL,
        patient_email TEXT NOT NULL,
        doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        doctor_name TEXT NOT NULL,
        doctor_email TEXT NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        reason TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
        doctor_note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

def generate_doctor_referral_code(email: str) -> str:
    prefix = email.split("@")[0].upper()[:8]
    return f"REF-{prefix}"

def create_user(
    name: str,
    email: str,
    password: str,
    role: str,
    doctor_referral_code: Optional[str] = None,
) -> Dict[str, Any]:
    email = email.strip().lower()
    name = name.strip()
    pwd_hash = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        raise ValueError("An account with this email address already exists.")

    assigned_doctor_email = None
    referral_code = None

    if role == "Doctor":
        referral_code = generate_doctor_referral_code(email)
    elif role == "Patient" and doctor_referral_code:
        clean_code = doctor_referral_code.strip()
        # Look up doctor by referral_code or email
        cursor.execute(
            "SELECT email FROM users WHERE role = 'Doctor' AND (referral_code = ? OR email = ?)",
            (clean_code.upper(), clean_code.lower()),
        )
        row = cursor.fetchone()
        if row:
            assigned_doctor_email = row["email"]

    cursor.execute(
        """
        INSERT INTO users (name, email, password_hash, role, doctor_email, referral_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (name, email, pwd_hash, role, assigned_doctor_email, referral_code, now),
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "name": name,
        "email": email,
        "role": role,
        "doctor_email": assigned_doctor_email,
        "referral_code": referral_code,
        "created_at": now,
    }

def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    email = email.strip().lower()
    pwd_hash = hash_password(password)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, role, doctor_email, referral_code, created_at FROM users WHERE email = ? AND password_hash = ?",
        (email, pwd_hash),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return dict(row)

def create_session(user_id: int) -> str:
    token = f"nst_{uuid.uuid4().hex}{uuid.uuid4().hex[:16]}"
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
        (token, user_id, now),
    )
    conn.commit()
    conn.close()
    return token

def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    
    clean_token = token.strip()
    if clean_token.lower().startswith("bearer "):
        clean_token = clean_token[7:].strip()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.name, u.email, u.role, u.doctor_email, u.referral_code, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
        """,
        (clean_token,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return dict(row)

def associate_patient_with_doctor(patient_email: str, doctor_email: str) -> bool:
    patient_email = patient_email.strip().lower()
    doctor_email = doctor_email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify doctor exists and has Doctor role
    cursor.execute("SELECT id FROM users WHERE email = ? AND role = 'Doctor'", (doctor_email,))
    if not cursor.fetchone():
        conn.close()
        return False

    cursor.execute(
        "UPDATE users SET doctor_email = ? WHERE email = ? AND role = 'Patient'",
        (doctor_email, patient_email),
    )
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def save_screening(
    patient_user: Dict[str, Any],
    screening_data: Dict[str, Any],
) -> Dict[str, Any]:
    modalities = screening_data.get("modalities", {})
    speech = modalities.get("speech", {})
    handwriting = modalities.get("handwriting", {})
    gait = modalities.get("gait", {})
    combined = screening_data.get("combined_result", {})

    now = datetime.now(timezone.utc).isoformat()
    pos_count = int(combined.get("positive_modalities_count", 0))
    total_count = 3
    modality_concordance = f"{pos_count} of {total_count} elevated"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO screenings (
            patient_id, patient_email, patient_name, timestamp,
            speech_prediction, speech_confidence,
            handwriting_prediction, handwriting_confidence,
            gait_prediction, gait_confidence,
            composite_prediction, composite_classification,
            risk_score, confidence,
            positive_modalities_count, total_modalities_count,
            modality_concordance, summary, raw_details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            patient_user["id"],
            patient_user["email"],
            patient_user["name"],
            now,
            str(speech.get("prediction", "N/A")),
            float(speech.get("confidence", 0.0)),
            str(handwriting.get("prediction", "N/A")),
            float(handwriting.get("confidence", 0.0)),
            str(gait.get("prediction", "N/A")),
            float(gait.get("confidence", 0.0)),
            str(combined.get("prediction", "N/A")),
            str(combined.get("classification", "N/A")),
            float(combined.get("risk_score", 0.0)),
            float(combined.get("confidence", 0.0)),
            pos_count,
            total_count,
            modality_concordance,
            str(combined.get("summary", "")),
            json.dumps(screening_data),
        ),
    )
    screening_id = cursor.lastrowid
    conn.commit()

    cursor.execute("SELECT * FROM screenings WHERE id = ?", (screening_id,))
    row = dict(cursor.fetchone())
    conn.close()

    try:
        row["raw_details"] = json.loads(row["raw_details_json"])
    except Exception:
        row["raw_details"] = {}

    return row

def get_patient_screenings(patient_email: str) -> List[Dict[str, Any]]:
    patient_email = patient_email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, patient_id, patient_email, patient_name, timestamp,
               speech_prediction, speech_confidence,
               handwriting_prediction, handwriting_confidence,
               gait_prediction, gait_confidence,
               composite_prediction, composite_classification,
               risk_score, confidence,
               positive_modalities_count, total_modalities_count,
               modality_concordance, summary, raw_details_json
        FROM screenings
        WHERE patient_email = ?
        ORDER BY id DESC
        """,
        (patient_email,),
    )
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        try:
            item["raw_details"] = json.loads(item["raw_details_json"])
        except Exception:
            item["raw_details"] = {}
        del item["raw_details_json"]
        results.append(item)

    return results

def get_doctor_patients(doctor_email: str) -> List[Dict[str, Any]]:
    doctor_email = doctor_email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find patients assigned to this doctor
    # (or if doctor has referral code, patients linked by doctor_email)
    cursor.execute(
        """
        SELECT id, name, email, role, doctor_email, created_at
        FROM users
        WHERE role = 'Patient' AND doctor_email = ?
        ORDER BY id DESC
        """,
        (doctor_email,),
    )
    patients = [dict(p) for p in cursor.fetchall()]

    # For each patient, fetch the latest screening and total screening count
    for patient in patients:
        cursor.execute(
            """
            SELECT id, timestamp, composite_prediction, composite_classification,
                   risk_score, confidence, positive_modalities_count,
                   modality_concordance, summary
            FROM screenings
            WHERE patient_email = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (patient["email"],),
        )
        latest = cursor.fetchone()
        patient["latest_screening"] = dict(latest) if latest else None

        cursor.execute(
            "SELECT COUNT(*) as cnt FROM screenings WHERE patient_email = ?",
            (patient["email"],),
        )
        patient["screening_count"] = cursor.fetchone()["cnt"]

    conn.close()
    return patients

def get_doctor_patient_screenings(doctor_email: str, patient_email: str) -> Optional[List[Dict[str, Any]]]:
    doctor_email = doctor_email.strip().lower()
    patient_email = patient_email.strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()
    # Check that patient exists and is associated with this doctor
    cursor.execute(
        "SELECT id FROM users WHERE email = ? AND role = 'Patient' AND doctor_email = ?",
        (patient_email, doctor_email),
    )
    patient = cursor.fetchone()
    conn.close()

    if not patient:
        return None

    return get_patient_screenings(patient_email)

# ==========================================
# Appointments Management Helpers
# ==========================================

def get_registered_doctors() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, email, referral_code, created_at
        FROM users
        WHERE role = 'Doctor'
        ORDER BY name ASC
        """
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def create_appointment(
    patient_user: Dict[str, Any],
    doctor_id: int,
    appointment_date: str,
    appointment_time: str,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify doctor exists and has Doctor role
    cursor.execute(
        "SELECT id, name, email FROM users WHERE id = ? AND role = 'Doctor'",
        (doctor_id,),
    )
    doc = cursor.fetchone()
    if not doc:
        conn.close()
        raise ValueError("Selected clinician was not found or is not registered as a doctor.")

    now = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """
        INSERT INTO appointments (
            patient_id, patient_name, patient_email,
            doctor_id, doctor_name, doctor_email,
            appointment_date, appointment_time,
            reason, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """,
        (
            patient_user["id"],
            patient_user["name"],
            patient_user["email"],
            doc["id"],
            doc["name"],
            doc["email"],
            appointment_date.strip(),
            appointment_time.strip(),
            reason.strip() if reason else None,
            now,
            now,
        ),
    )
    appt_id = cursor.lastrowid

    # If patient has not yet associated a doctor, link to this doctor as their primary doctor
    cursor.execute(
        "UPDATE users SET doctor_email = ? WHERE id = ? AND role = 'Patient' AND (doctor_email IS NULL OR doctor_email = '')",
        (doc["email"], patient_user["id"]),
    )

    conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appt_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

def get_patient_appointments(patient_email: str) -> List[Dict[str, Any]]:
    patient_email = patient_email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, patient_id, patient_name, patient_email,
               doctor_id, doctor_name, doctor_email,
               appointment_date, appointment_time,
               reason, status, doctor_note, created_at, updated_at
        FROM appointments
        WHERE patient_email = ?
        ORDER BY appointment_date DESC, appointment_time DESC, id DESC
        """,
        (patient_email,),
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_doctor_appointments(doctor_email: str) -> List[Dict[str, Any]]:
    doctor_email = doctor_email.strip().lower()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, patient_id, patient_name, patient_email,
               doctor_id, doctor_name, doctor_email,
               appointment_date, appointment_time,
               reason, status, doctor_note, created_at, updated_at
        FROM appointments
        WHERE doctor_email = ?
        ORDER BY appointment_date DESC, appointment_time DESC, id DESC
        """,
        (doctor_email,),
    )
    appts = [dict(r) for r in cursor.fetchall()]

    # Attach the patient's latest screening findings for each appointment
    for appt in appts:
        cursor.execute(
            """
            SELECT id, timestamp, composite_prediction, composite_classification,
                   risk_score, confidence, positive_modalities_count,
                   modality_concordance, summary
            FROM screenings
            WHERE patient_email = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (appt["patient_email"],),
        )
        latest = cursor.fetchone()
        appt["patient_latest_screening"] = dict(latest) if latest else None

    conn.close()
    return appts

def update_appointment_status(
    appointment_id: int,
    doctor_email: str,
    status: str,
    doctor_note: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    if status not in ("accepted", "rejected"):
        raise ValueError("Status must be either 'accepted' or 'rejected'.")

    doctor_email = doctor_email.strip().lower()
    now = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure this appointment belongs to this doctor
    cursor.execute(
        "SELECT id FROM appointments WHERE id = ? AND doctor_email = ?",
        (appointment_id, doctor_email),
    )
    if not cursor.fetchone():
        conn.close()
        return None

    cursor.execute(
        """
        UPDATE appointments
        SET status = ?, doctor_note = ?, updated_at = ?
        WHERE id = ? AND doctor_email = ?
        """,
        (status, doctor_note.strip() if doctor_note else None, now, appointment_id, doctor_email),
    )
    conn.commit()

    cursor.execute("SELECT * FROM appointments WHERE id = ?", (appointment_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row

# Initialize tables immediately upon module import
init_db()


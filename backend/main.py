import os
import sqlite3
import uuid
import bcrypt
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, Form, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import jwt
import resend
from dotenv import load_dotenv

load_dotenv(override=True)

# Database Setup
db_path = os.environ.get("DB_PATH", "DB/vector_db.db")
db_dir = os.path.dirname(db_path)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

# Resend Setup
resend.api_key = os.environ.get("RESEND_API_KEY", "")

# JWT Setup
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-jwt-key")
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def send_reset_email(email: str, token: str):
    reset_link = f"http://localhost:3000/?reset_token={token}"
    html_content = f"""
    <h2>Password Reset Request</h2>
    <p>You requested a password reset for your Vector Shift account.</p>
    <p>Click the button below to set a new password:</p>
    <a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Reset Password</a>
    <p>If you did not request this, please ignore this email.</p>
    """
    try:
        if not resend.api_key or "placeholder" in resend.api_key:
            # Fallback to mock mode if the user hasn't configured the key yet!
            print("\n" + "="*50)
            print("[MOCK MODE - RESEND KEY NOT CONFIGURED]")
            print("MOCK EMAIL SENT TO:", email)
            print("Password Reset Link:")
            print(reset_link)
            print("="*50 + "\n")
        else:
            resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": email,
                "subject": "Reset your Vector Shift Password",
                "html": html_content
            })
            print(f"Real email sent to {email} via Resend!")
    except Exception as e:
        print("Failed to send email via Resend:", e)
        print("\n" + "="*50)
        print("[FALLBACK - EMAIL FAILED TO SEND]")
        print("MOCK EMAIL LINK FOR:", email)
        print("Password Reset Link:")
        print(reset_link)
        print("="*50 + "\n")

def send_verification_email(email: str, token: str):
    verify_link = f"http://localhost:3000/?verify_token={token}"
    html_content = f"""
    <h2>Welcome to Vector Shift!</h2>
    <p>Please verify your email address to activate your account.</p>
    <a href="{verify_link}" style="display:inline-block;padding:12px 24px;background:#10b981;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a>
    """
    try:
        if not resend.api_key or "placeholder" in resend.api_key:
            print("\n" + "="*50)
            print("[MOCK MODE - RESEND KEY NOT CONFIGURED]")
            print("MOCK VERIFICATION EMAIL SENT TO:", email)
            print("Verification Link:")
            print(verify_link)
            print("="*50 + "\n")
        else:
            resend.Emails.send({
                "from": "onboarding@resend.dev",
                "to": email,
                "subject": "Verify your Vector Shift Account",
                "html": html_content
            })
            print(f"Verification email sent to {email} via Resend!")
    except Exception as e:
        print("Failed to send verification email via Resend:", e)
        print("\n" + "="*50)
        print("[FALLBACK - EMAIL FAILED TO SEND]")
        print("MOCK VERIFICATION EMAIL LINK FOR:", email)
        print("Verification Link:")
        print(verify_link)
        print("="*50 + "\n")

def init_db():
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                avatar_url TEXT,
                is_verified INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_resets (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at DATETIME NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at DATETIME NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pipelines (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                nodes TEXT NOT NULL,
                edges TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS custom_nodes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                config TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

init_db()

def get_db_session():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

class AuthRequest(BaseModel):
    username: str
    password_hash: str # The frontend pre-hash
    email: Optional[str] = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def read_root():
    return {'Ping': 'Pong'}

@app.get('/config')
def get_config():
    is_demo = os.environ.get("IS_DEMO", "false").lower() == "true"
    print("Is Demo Mode:", is_demo)
    return {"is_demo": is_demo}

@app.post('/auth')
def auth_user(request: AuthRequest, background_tasks: BackgroundTasks, db: sqlite3.Connection = Depends(get_db_session)):
    username = request.username
    incoming_hash = request.password_hash
    
    cursor = db.cursor()
    cursor.execute("SELECT id, password_hash, avatar_url, email, is_verified FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    
    if user:
        # Login
        stored_id = user[0]
        stored_hash = user[1]
        avatar_url = user[2]
        is_verified = user[4]
        
        # Verify the hash using pure bcrypt
        if bcrypt.checkpw(incoming_hash.encode('utf-8'), stored_hash.encode('utf-8')):
            if is_verified == 0:
                raise HTTPException(status_code=401, detail="Please check your email to verify your account before logging in.")
            
            token = jwt.encode({
                "user_id": stored_id,
                "exp": datetime.utcnow() + timedelta(days=7)
            }, JWT_SECRET, algorithm="HS256")
            
            return {"status": "success", "message": "Logged in", "token": token, "user": {"id": stored_id, "username": username, "avatar_url": avatar_url, "email": user[3]}}
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        # Signup
        if not request.email:
            raise HTTPException(status_code=400, detail="Email is required for signup")
            
        new_id = str(uuid.uuid4())
        hashed_password = bcrypt.hashpw(incoming_hash.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        try:
            cursor.execute("INSERT INTO users (id, username, email, password_hash, is_verified) VALUES (?, ?, ?, ?, 0)", (new_id, username, request.email, hashed_password))
            
            # Generate verification token
            token = str(uuid.uuid4())
            expires = datetime.now() + timedelta(days=1) # 24 hour expiry
            cursor.execute("INSERT INTO verification_tokens (token, user_id, expires_at) VALUES (?, ?, ?)", (token, new_id, expires))
            
            # Fire background email task
            background_tasks.add_task(send_verification_email, request.email, token)
            
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=400, detail="Username or email already exists")
            
        return {"status": "success", "message": "User created. Please check your email to verify your account."}

class VerifyRequest(BaseModel):
    token: str

@app.post('/auth/verify')
def verify_email(request: VerifyRequest, db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT user_id, expires_at FROM verification_tokens WHERE token = ?", (request.token,))
    record = cursor.fetchone()
    
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
        
    user_id = record[0]
    expires_at = datetime.strptime(record[1], '%Y-%m-%d %H:%M:%S.%f')
    
    if datetime.now() > expires_at:
        cursor.execute("DELETE FROM verification_tokens WHERE token = ?", (request.token,))
        raise HTTPException(status_code=400, detail="Verification token has expired")
        
    # Mark user as verified
    cursor.execute("UPDATE users SET is_verified = 1 WHERE id = ?", (user_id,))
    cursor.execute("DELETE FROM verification_tokens WHERE token = ?", (request.token,))
 
    # Generate token so user can be automatically logged in
    cursor.execute("SELECT id, username, avatar_url, email FROM users WHERE id = ?", (user_id,))
    user_record = cursor.fetchone()
 
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")
        
    stored_id, username, avatar_url, email = user_record
    
    token = jwt.encode({
        "user_id": stored_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }, JWT_SECRET, algorithm="HS256")
    
    return {
        "status": "success", 
        "message": "Email verified successfully!",
        "token": token,
        "user": {"id": stored_id, "username": username, "avatar_url": avatar_url, "email": email}
    }

class AvatarRequest(BaseModel):
    avatar_url: str

@app.post('/users/{user_id}/avatar')
def update_avatar(user_id: str, request: AvatarRequest, db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (request.avatar_url, user_id))
    return {"status": "success"}

class ResetRequest(BaseModel):
    email: str

@app.post('/auth/reset-request')
def request_password_reset(request: ResetRequest, background_tasks: BackgroundTasks, db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
    user = cursor.fetchone()
    
    if user:
        user_id = user[0]
        token = str(uuid.uuid4())
        expires = datetime.now() + timedelta(minutes=15)
        
        cursor.execute("INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)", (token, user_id, expires))
        
        # Fire off the real email asynchronously!
        background_tasks.add_task(send_reset_email, request.email, token)
        
    # Always return success to prevent email enumeration
    return {"status": "success", "message": "If that email exists, a reset link was sent."}

class ResetPasswordSubmit(BaseModel):
    token: str
    new_password_hash: str

@app.post('/auth/reset-password')
def reset_password(request: ResetPasswordSubmit, db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    
    # Verify token
    cursor.execute("SELECT user_id, expires_at FROM password_resets WHERE token = ?", (request.token,))
    reset_record = cursor.fetchone()
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
        
    user_id = reset_record[0]
    expires_at = datetime.strptime(reset_record[1], '%Y-%m-%d %H:%M:%S.%f')
    
    if datetime.now() > expires_at:
        cursor.execute("DELETE FROM password_resets WHERE token = ?", (request.token,))
        raise HTTPException(status_code=400, detail="Token has expired")
        
    # Valid token, update password
    hashed_password = bcrypt.hashpw(request.new_password_hash.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed_password, user_id))
    
    # Delete token so it can't be reused
    cursor.execute("DELETE FROM password_resets WHERE token = ?", (request.token,))
    
    return {"status": "success", "message": "Password updated successfully"}

class PipelineSaveRequest(BaseModel):
    name: str
    nodes: str
    edges: str

@app.post('/pipelines')
def create_pipeline(request: PipelineSaveRequest, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    new_id = str(uuid.uuid4())
    cursor.execute("INSERT INTO pipelines (id, user_id, name, nodes, edges) VALUES (?, ?, ?, ?, ?)", (new_id, user_id, request.name, request.nodes, request.edges))
    return {"status": "success", "id": new_id}

@app.put('/pipelines/{pipeline_id}')
def update_pipeline(pipeline_id: str, request: PipelineSaveRequest, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM pipelines WHERE id = ? AND user_id = ?", (pipeline_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized or pipeline not found")
    cursor.execute("UPDATE pipelines SET name = ?, nodes = ?, edges = ? WHERE id = ?", (request.name, request.nodes, request.edges, pipeline_id))
    return {"status": "success"}

@app.get('/pipelines')
def get_pipelines(user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id, name, nodes, edges, created_at FROM pipelines WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    pipelines = [{"id": r[0], "name": r[1], "nodes": r[2], "edges": r[3], "created_at": r[4]} for r in rows]
    return {"status": "success", "pipelines": pipelines}

@app.delete('/pipelines/{pipeline_id}')
def delete_pipeline(pipeline_id: str, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM pipelines WHERE id = ? AND user_id = ?", (pipeline_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized or pipeline not found")
    cursor.execute("DELETE FROM pipelines WHERE id = ?", (pipeline_id,))
    return {"status": "success"}

class CustomNodeSaveRequest(BaseModel):
    name: str
    config: str

@app.post('/custom-nodes')
def save_custom_node(request: CustomNodeSaveRequest, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    new_id = str(uuid.uuid4())
    cursor.execute("INSERT INTO custom_nodes (id, user_id, name, config) VALUES (?, ?, ?, ?)", (new_id, user_id, request.name, request.config))
    return {"status": "success", "id": new_id}

@app.put('/custom-nodes/{node_id}')
def update_custom_node(node_id: str, request: CustomNodeSaveRequest, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM custom_nodes WHERE id = ? AND user_id = ?", (node_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized or node not found")
    cursor.execute("UPDATE custom_nodes SET name = ?, config = ? WHERE id = ?", (request.name, request.config, node_id))
    return {"status": "success"}

@app.get('/custom-nodes')
def get_custom_nodes(user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id, name, config, created_at FROM custom_nodes WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    custom_nodes = [{"id": r[0], "name": r[1], "config": r[2], "created_at": r[3]} for r in rows]
    return {"status": "success", "custom_nodes": custom_nodes}

@app.delete('/custom-nodes/{node_id}')
def delete_custom_node(node_id: str, user_id: str = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db_session)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM custom_nodes WHERE id = ? AND user_id = ?", (node_id, user_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=403, detail="Not authorized or node not found")
    cursor.execute("DELETE FROM custom_nodes WHERE id = ?", (node_id,))
    return {"status": "success"}

@app.post('/pipelines/parse')
def parse_pipeline(pipeline: str = Form(...)):
    try:
        data = json.loads(pipeline)
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        
        num_nodes = len(nodes)
        num_edges = len(edges)
        
        # Check if DAG
        # Build adjacency list
        graph = {node['id']: [] for node in nodes}
        for edge in edges:
            source = edge.get('source')
            target = edge.get('target')
            if source in graph:
                graph[source].append(target)
                
        # DFS to find cycle
        visited = set()
        rec_stack = set()
        
        def is_cyclic(node):
            if node in rec_stack:
                return True
            if node in visited:
                return False
                
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if is_cyclic(neighbor):
                    return True
                    
            rec_stack.remove(node)
            return False
            
        is_dag = True
        for node in graph:
            if node not in visited:
                if is_cyclic(node):
                    is_dag = False
                    break
                    
        return {'num_nodes': num_nodes, 'num_edges': num_edges, 'is_dag': is_dag}
    except Exception as e:
        return {'error': str(e)}

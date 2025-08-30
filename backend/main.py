from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import List, Annotated

from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

import models
from database import SessionLocal, engine

# --- Initial Setup ---
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Paisa Mission Control API",
    description="API for managing astronauts and their assigned missions.",
    version="1.0.0"
)

# --- Middleware ---
origins = [
    "http://localhost:3000",
    "https://paisa-mission-control.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Use the list you defined
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security & JWT Configuration ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "a_very_difficult_secret_key_to_guess"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Pydantic Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class MissionBase(BaseModel):
    title: str
    description: str | None = None
    status: models.MissionStatus = models.MissionStatus.PENDING

class MissionCreate(MissionBase):
    pass

class MissionResponse(MissionBase):
    id: int
    astronaut_id: int
    model_config = ConfigDict(from_attributes=True)

class AstronautBase(BaseModel):
    name: str
    email: str

class AstronautCreate(AstronautBase):
    pass

class AstronautResponse(AstronautBase):
    id: int
    missions: List[MissionResponse] = []
    model_config = ConfigDict(from_attributes=True)


# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Security Utility Functions ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# --- API Endpoints ---
@app.get("/", tags=["Root"])
def read_root():
    return {"status": "API is running"}

# --- Authentication Endpoints ---
@app.post("/register/", response_model=UserResponse, tags=["Authentication"])
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pass = hash_password(user.password)
    new_user = models.User(name=user.name, email=user.email, hashed_password=hashed_pass)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token, tags=["Authentication"])
def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Astronauts CRUD Endpoints ---
@app.post("/astronauts/", response_model=AstronautResponse, status_code=status.HTTP_201_CREATED, tags=["Astronauts"])
def create_astronaut(astronaut: AstronautCreate, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_astronaut = models.Astronaut(**astronaut.model_dump())
    db.add(db_astronaut)
    db.commit()
    db.refresh(db_astronaut)
    return db_astronaut

@app.get("/astronauts/", response_model=List[AstronautResponse], tags=["Astronauts"])
def read_astronauts(db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    return db.query(models.Astronaut).all()

@app.put("/astronauts/{astronaut_id}", response_model=AstronautResponse, tags=["Astronauts"])
def update_astronaut(astronaut_id: int, astronaut_update: AstronautCreate, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_astronaut = db.query(models.Astronaut).filter(models.Astronaut.id == astronaut_id).first()
    if db_astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    
    update_data = astronaut_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_astronaut, key, value)
        
    db.commit()
    db.refresh(db_astronaut)
    return db_astronaut

@app.delete("/astronauts/{astronaut_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Astronauts"])
def delete_astronaut(astronaut_id: int, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_astronaut = db.query(models.Astronaut).filter(models.Astronaut.id == astronaut_id).first()
    if db_astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
        
    db.delete(db_astronaut)
    db.commit()
    return

# --- Missions CRUD Endpoints ---
@app.post("/astronauts/{astronaut_id}/missions/", response_model=MissionResponse, status_code=status.HTTP_201_CREATED, tags=["Missions"])
def create_mission_for_astronaut(astronaut_id: int, mission: MissionCreate, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_astronaut = db.query(models.Astronaut).filter(models.Astronaut.id == astronaut_id).first()
    if db_astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    
    db_mission = models.Mission(**mission.model_dump(), astronaut_id=astronaut_id)
    db.add(db_mission)
    db.commit()
    db.refresh(db_mission)
    return db_mission

@app.get("/astronauts/{astronaut_id}/missions/", response_model=List[MissionResponse], tags=["Missions"])
def read_missions_for_astronaut(astronaut_id: int, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_astronaut = db.query(models.Astronaut).filter(models.Astronaut.id == astronaut_id).first()
    if db_astronaut is None:
        raise HTTPException(status_code=404, detail="Astronaut not found")
    return db_astronaut.missions

@app.put("/missions/{mission_id}", response_model=MissionResponse, tags=["Missions"])
def update_mission(mission_id: int, mission_update: MissionCreate, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_mission = db.query(models.Mission).filter(models.Mission.id == mission_id).first()
    if db_mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    update_data = mission_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_mission, key, value)
        
    db.commit()
    db.refresh(db_mission)
    return db_mission

@app.delete("/missions/{mission_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Missions"])
def delete_mission(mission_id: int, db: Session = Depends(get_db), current_user: UserResponse = Depends(get_current_user)):
    db_mission = db.query(models.Mission).filter(models.Mission.id == mission_id).first()
    if db_mission is None:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    db.delete(db_mission)
    db.commit()
    return


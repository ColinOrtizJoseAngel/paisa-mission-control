import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Astronaut(Base):
    __tablename__ = "astronauts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)

    missions = relationship("Mission", back_populates="owner")


class MissionStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(MissionStatus), default=MissionStatus.PENDING, nullable=False)
    astronaut_id = Column(Integer, ForeignKey("astronauts.id"), nullable=False)

    owner = relationship("Astronaut", back_populates="missions")


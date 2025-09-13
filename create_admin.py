from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
# Import all models to ensure SQLAlchemy's mapper registry is populated
import app.db.base_all_models  # noqa: F401
from app.models.user import User, UserRole

# Create database engine and session
SQLALCHEMY_DATABASE_URL = "sqlite:///./course_platform.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

# Admin user details
admin_user = {
    "email": "admin@coursesphere.com",
    "password": "admin123",  # This will be hashed
    "full_name": "Admin User",
    # use UserRole enum for consistency
    "role": UserRole.ADMIN
}
# Create or replace admin user
existing = db.query(User).filter_by(email=admin_user["email"]).first()

if existing:
    print(f"Found existing user with email {admin_user['email']} (id={existing.id}). Trying to remove and recreate as admin.")
    try:
        db.delete(existing)
        db.commit()
        print("Existing user deleted; creating new admin user.")
        existing = None
    except Exception as e:
        # Could not delete due to FK constraints; fall back to updating the existing user to admin
        db.rollback()
        try:
            existing.full_name = admin_user["full_name"]
            existing.hashed_password = get_password_hash(admin_user["password"])
            existing.role = UserRole.ADMIN
            db.add(existing)
            db.commit()
            db.refresh(existing)
            print(f"Updated existing user (id={existing.id}) to admin.")
        except Exception as e2:
            print("Failed to update existing user to admin:", str(e2))
        finally:
            db.close()
            exit(0)

# If we didn't update an existing user in-place, create a fresh admin user
try:
    db_user = User(
        email=admin_user["email"],
        full_name=admin_user["full_name"],
        hashed_password=get_password_hash(admin_user["password"]),
        role=admin_user["role"]
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    print("Admin user created successfully!")
    print("Email:", admin_user["email"])
    print("Password:", admin_user["password"])
except Exception as e:
    print("Error creating admin user:", str(e))
finally:
    db.close()

from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, EmailStr, validator

class Settings(BaseSettings):
    ENVIRONMENT: str
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    
    @property
    def async_database_url(self) -> str:
        """Get the async database URL from the sync URL."""
        # Check if sqlite
        if self.DATABASE_URL.startswith('sqlite:///'):
            return self.DATABASE_URL.replace('sqlite:///', 'sqlite+aiosqlite:///')
        # Check if postgresql
        elif self.DATABASE_URL.startswith('postgresql://'):
            return self.DATABASE_URL.replace('postgresql://', 'postgresql+asyncpg://')
        # Return as is for other cases
        return self.DATABASE_URL
    
    @property
    def sync_database_url(self) -> str:
        """Get the sync database URL."""
        if self.DATABASE_URL.startswith('postgresql+asyncpg://'):
            return self.DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
        elif self.DATABASE_URL.startswith('sqlite+aiosqlite:///'):
            return self.DATABASE_URL.replace('sqlite+aiosqlite:///', 'sqlite:///')
        return self.DATABASE_URL
    
    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
    
    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Admin user
    FIRST_ADMIN_EMAIL: EmailStr
    FIRST_ADMIN_PASSWORD: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

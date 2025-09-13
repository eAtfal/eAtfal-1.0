from fastapi import Depends, HTTPException, status
from app.api.deps import get_current_active_user
from app.models.user import User, UserRole
from typing import List

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: User = Depends(get_current_active_user)) -> bool:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {[role.value for role in self.allowed_roles]}"
            )
        return True

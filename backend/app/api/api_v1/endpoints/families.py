from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.family import Family, FamilyMember
from app.schemas.family import (
    FamilyCreate,
    FamilyMemberCreate,
    FamilyMemberOut,
    FamilyOut,
    FamilyUpdate,
)
from app.schemas.user import User

router = APIRouter()

@router.post("/", response_model=FamilyOut)
def create_family(
    *,
    db: Session = Depends(get_db),
    family_in: FamilyCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = Family(
        name=family_in.name,
        description=family_in.description,
        created_by=current_user.id
    )
    db.add(family)
    db.commit()
    db.refresh(family)
    # Add creator as primary member
    member = FamilyMember(
        family_id=family.id,
        user_id=current_user.id,
        role="primary",
        can_view_data=True,
        can_add_notes=True,
        can_edit_data=True
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return family

@router.get("/", response_model=list[FamilyOut])
def list_families(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    families = db.query(Family).join(FamilyMember).filter(FamilyMember.user_id == current_user.id).all()
    return families

@router.get("/{family_id}", response_model=FamilyOut)
def get_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    member = db.query(FamilyMember).filter(FamilyMember.family_id == family_id, FamilyMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this family")
    return family

@router.put("/{family_id}", response_model=FamilyOut)
def update_family(
    family_id: int,
    family_in: FamilyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can update the family")
    for field, value in family_in.dict(exclude_unset=True).items():
        setattr(family, field, value)
    db.add(family)
    db.commit()
    db.refresh(family)
    return family

@router.delete("/{family_id}")
def delete_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete the family")
    db.delete(family)
    db.commit()
    return {"message": "Family deleted"}

@router.post("/{family_id}/members", response_model=FamilyMemberOut)
def add_family_member(
    family_id: int,
    member_in: FamilyMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can add members")
    member = FamilyMember(
        family_id=family_id,
        user_id=member_in.user_id,
        role=member_in.role,
        can_view_data=member_in.can_view_data,
        can_add_notes=member_in.can_add_notes,
        can_edit_data=member_in.can_edit_data
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member

@router.delete("/{family_id}/members/{user_id}")
def remove_family_member(
    family_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    if family.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can remove members")
    member = db.query(FamilyMember).filter(FamilyMember.family_id == family_id, FamilyMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}

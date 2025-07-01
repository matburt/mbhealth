
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.care_team import CareTeam, CareTeamInvitation, CareTeamMember
from app.models.user import User
from app.schemas.care_team import (
    CareTeamCreate,
    CareTeamInvitationOut,
    CareTeamInviteCreate,
    CareTeamMemberOut,
    CareTeamMemberUpdate,
    CareTeamOut,
    CareTeamUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[CareTeamOut])
def get_care_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's care teams (teams they created or are members of)"""

    # Get teams the user created
    created_teams = db.query(CareTeam).filter(
        CareTeam.created_by == current_user.id
    ).all()

    # Get teams the user is a member of
    member_teams = db.query(CareTeam).join(CareTeamMember).filter(
        CareTeamMember.user_id == current_user.id
    ).all()

    # Combine and deduplicate
    all_teams = {team.id: team for team in created_teams + member_teams}
    return list(all_teams.values())


@router.get("/{care_team_id}", response_model=CareTeamOut)
def get_care_team(
    care_team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific care team"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Check if user has access (creator or member)
    is_member = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id,
        CareTeamMember.user_id == current_user.id
    ).first()

    if care_team.created_by != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Access denied")

    return care_team


@router.post("/", response_model=CareTeamOut)
def create_care_team(
    care_team: CareTeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new care team"""

    db_care_team = CareTeam(
        name=care_team.name,
        description=care_team.description,
        specialty=care_team.specialty,
        created_by=current_user.id
    )

    db.add(db_care_team)
    db.commit()
    db.refresh(db_care_team)

    # Add creator as admin member
    admin_member = CareTeamMember(
        care_team_id=db_care_team.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(admin_member)
    db.commit()

    return db_care_team


@router.put("/{care_team_id}", response_model=CareTeamOut)
def update_care_team(
    care_team_id: int,
    care_team_update: CareTeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a care team"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Check if user is creator or admin
    is_admin = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id,
        CareTeamMember.user_id == current_user.id,
        CareTeamMember.role == "admin"
    ).first()

    if care_team.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can update care teams")

    # Update fields
    for field, value in care_team_update.model_dump(exclude_unset=True).items():
        setattr(care_team, field, value)

    db.commit()
    db.refresh(care_team)
    return care_team


@router.delete("/{care_team_id}")
def delete_care_team(
    care_team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a care team"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Only creator can delete
    if care_team.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete care teams")

    db.delete(care_team)
    db.commit()
    return {"message": "Care team deleted successfully"}


@router.get("/{care_team_id}/members", response_model=list[CareTeamMemberOut])
def get_care_team_members(
    care_team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get care team members"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Check if user has access
    is_member = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id,
        CareTeamMember.user_id == current_user.id
    ).first()

    if care_team.created_by != current_user.id and not is_member:
        raise HTTPException(status_code=403, detail="Access denied")

    members = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id
    ).all()

    return members


@router.delete("/{care_team_id}/members/{member_id}")
def remove_care_team_member(
    care_team_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from care team"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    member = db.query(CareTeamMember).filter(
        CareTeamMember.id == member_id,
        CareTeamMember.care_team_id == care_team_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check permissions
    is_admin = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id,
        CareTeamMember.user_id == current_user.id,
        CareTeamMember.role == "admin"
    ).first()

    # Can remove if: creator, admin, or removing yourself
    if (care_team.created_by != current_user.id and
        not is_admin and
        member.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Permission denied")

    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}


@router.put("/{care_team_id}/members/{member_id}", response_model=CareTeamMemberOut)
def update_member_role(
    care_team_id: int,
    member_id: int,
    member_update: CareTeamMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update member role or specialty"""

    care_team = db.query(CareTeam).filter(CareTeam.id == care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    member = db.query(CareTeamMember).filter(
        CareTeamMember.id == member_id,
        CareTeamMember.care_team_id == care_team_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Check permissions (only admins can update roles)
    is_admin = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team_id,
        CareTeamMember.user_id == current_user.id,
        CareTeamMember.role == "admin"
    ).first()

    if care_team.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can update member roles")

    # Update fields
    for field, value in member_update.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return member


@router.post("/invite")
def invite_member(
    invite: CareTeamInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a member to care team"""

    care_team = db.query(CareTeam).filter(CareTeam.id == invite.care_team_id).first()
    if not care_team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Check permissions
    is_admin = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == invite.care_team_id,
        CareTeamMember.user_id == current_user.id,
        CareTeamMember.role == "admin"
    ).first()

    if care_team.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can invite members")

    # Check if already invited
    existing_invite = db.query(CareTeamInvitation).filter(
        CareTeamInvitation.care_team_id == invite.care_team_id,
        CareTeamInvitation.email == invite.email,
        CareTeamInvitation.status == "pending"
    ).first()

    if existing_invite:
        raise HTTPException(status_code=400, detail="User already invited")

    # Check if already a member
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        existing_member = db.query(CareTeamMember).filter(
            CareTeamMember.care_team_id == invite.care_team_id,
            CareTeamMember.user_id == existing_user.id
        ).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already a member")

    # Create invitation
    invitation = CareTeamInvitation(
        care_team_id=invite.care_team_id,
        email=invite.email,
        role=invite.role,
        specialty=invite.specialty
    )

    db.add(invitation)
    db.commit()

    return {"message": "Invitation sent successfully"}


@router.get("/invitations", response_model=list[CareTeamInvitationOut])
def get_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invitations for current user"""

    invitations = db.query(CareTeamInvitation).filter(
        CareTeamInvitation.email == current_user.email,
        CareTeamInvitation.status == "pending"
    ).all()

    return invitations


@router.post("/invitations/{invitation_id}/accept")
def accept_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept care team invitation"""

    invitation = db.query(CareTeamInvitation).filter(
        CareTeamInvitation.id == invitation_id,
        CareTeamInvitation.email == current_user.email,
        CareTeamInvitation.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    # Check if already a member
    existing_member = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == invitation.care_team_id,
        CareTeamMember.user_id == current_user.id
    ).first()

    if existing_member:
        invitation.status = "accepted"
        db.commit()
        return {"message": "Already a member of this care team"}

    # Add as member
    member = CareTeamMember(
        care_team_id=invitation.care_team_id,
        user_id=current_user.id,
        role=invitation.role,
        specialty=invitation.specialty
    )

    invitation.status = "accepted"

    db.add(member)
    db.commit()

    return {"message": "Invitation accepted successfully"}


@router.post("/invitations/{invitation_id}/decline")
def decline_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline care team invitation"""

    invitation = db.query(CareTeamInvitation).filter(
        CareTeamInvitation.id == invitation_id,
        CareTeamInvitation.email == current_user.email,
        CareTeamInvitation.status == "pending"
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    invitation.status = "declined"
    db.commit()

    return {"message": "Invitation declined"}


@router.delete("/invitations/{invitation_id}")
def cancel_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel care team invitation (admin only)"""

    invitation = db.query(CareTeamInvitation).filter(
        CareTeamInvitation.id == invitation_id
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    care_team = invitation.care_team

    # Check permissions
    is_admin = db.query(CareTeamMember).filter(
        CareTeamMember.care_team_id == care_team.id,
        CareTeamMember.user_id == current_user.id,
        CareTeamMember.role == "admin"
    ).first()

    if care_team.created_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can cancel invitations")

    db.delete(invitation)
    db.commit()

    return {"message": "Invitation cancelled"}

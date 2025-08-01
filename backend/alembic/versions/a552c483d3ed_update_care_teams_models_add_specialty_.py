"""Update care teams models - add specialty, invitation model, fix member fields

Revision ID: a552c483d3ed
Revises: 62a48937fff5
Create Date: 2025-06-30 17:12:34.453903

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a552c483d3ed'
down_revision: str | None = '62a48937fff5'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('care_team_invitations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('care_team_id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('specialty', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('expires_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['care_team_id'], ['care_teams.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('care_team_invitations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_care_team_invitations_id'), ['id'], unique=False)

    with op.batch_alter_table('care_team_members', schema=None) as batch_op:
        batch_op.add_column(sa.Column('specialty', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('joined_at', sa.DateTime(), nullable=True))
        batch_op.drop_column('can_edit_data')
        batch_op.drop_column('created_at')
        batch_op.drop_column('can_add_notes')
        batch_op.drop_column('can_view_data')

    with op.batch_alter_table('care_teams', schema=None) as batch_op:
        batch_op.add_column(sa.Column('specialty', sa.String(), nullable=True))

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('care_teams', schema=None) as batch_op:
        batch_op.drop_column('specialty')

    with op.batch_alter_table('care_team_members', schema=None) as batch_op:
        batch_op.add_column(sa.Column('can_view_data', sa.BOOLEAN(), nullable=True))
        batch_op.add_column(sa.Column('can_add_notes', sa.BOOLEAN(), nullable=True))
        batch_op.add_column(sa.Column('created_at', sa.DATETIME(), nullable=True))
        batch_op.add_column(sa.Column('can_edit_data', sa.BOOLEAN(), nullable=True))
        batch_op.drop_column('joined_at')
        batch_op.drop_column('specialty')

    with op.batch_alter_table('care_team_invitations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_care_team_invitations_id'))

    op.drop_table('care_team_invitations')
    # ### end Alembic commands ###

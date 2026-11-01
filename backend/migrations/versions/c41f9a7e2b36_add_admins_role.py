"""add admins role

Revision ID: c41f9a7e2b36
Revises: 983f68b4dd5f
Create Date: 2026-10-31 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c41f9a7e2b36'
down_revision = '983f68b4dd5f'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('admins', schema=None) as batch_op:
        # Every admin that exists today becomes a super admin, so nobody loses access.
        batch_op.add_column(sa.Column('role', sa.String(length=20), server_default='super_admin', nullable=False))
        batch_op.create_check_constraint(
            'ck_admins_role', "role IN ('super_admin', 'moderator', 'support')"
        )
        # From now on a new admin must be given a role (the app defaults to 'support').
        batch_op.alter_column(
            'role',
            existing_type=sa.String(length=20),
            existing_nullable=False,
            server_default=None,
        )


def downgrade():
    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.drop_constraint('ck_admins_role', type_='check')
        batch_op.drop_column('role')

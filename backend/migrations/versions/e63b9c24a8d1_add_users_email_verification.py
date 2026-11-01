"""add users email verification

Revision ID: e63b9c24a8d1
Revises: d52a8b17f0c9
Create Date: 2026-11-01 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e63b9c24a8d1'
down_revision = 'd52a8b17f0c9'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        # Every student who already has an account counts as verified, so nobody is
        # locked out of posting. Only accounts created from now on must verify.
        batch_op.add_column(sa.Column('email_verified', sa.Boolean(), server_default=sa.text('true'), nullable=False))
        batch_op.add_column(sa.Column('verification_sent_at', sa.DateTime(), nullable=True))
        batch_op.alter_column(
            'email_verified',
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=sa.text('false'),
        )


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('verification_sent_at')
        batch_op.drop_column('email_verified')

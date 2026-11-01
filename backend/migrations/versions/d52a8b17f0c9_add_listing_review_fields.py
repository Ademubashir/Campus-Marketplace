"""add listing review fields

Revision ID: d52a8b17f0c9
Revises: c41f9a7e2b36
Create Date: 2026-10-31 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd52a8b17f0c9'
down_revision = 'c41f9a7e2b36'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('listings', schema=None) as batch_op:
        # Every listing that exists today counts as approved, so nothing disappears.
        batch_op.add_column(sa.Column('review_status', sa.String(length=10), server_default='approved', nullable=False))
        batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('reviewed_by', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('reviewed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('submitted_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False))
        batch_op.create_check_constraint(
            'ck_listings_review_status', "review_status IN ('pending', 'approved', 'rejected')"
        )
        batch_op.create_foreign_key(
            'fk_listings_reviewed_by_admins', 'admins', ['reviewed_by'], ['id'], ondelete='SET NULL'
        )
        batch_op.create_index(batch_op.f('ix_listings_review_status'), ['review_status'], unique=False)
        # From now on a listing that does not say otherwise starts out pending.
        batch_op.alter_column(
            'review_status',
            existing_type=sa.String(length=10),
            existing_nullable=False,
            server_default='pending',
        )

    # The queue shows the oldest first, so old listings keep the date they were posted.
    op.execute("UPDATE listings SET submitted_at = created_at WHERE created_at IS NOT NULL")


def downgrade():
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_listings_review_status'))
        batch_op.drop_constraint('fk_listings_reviewed_by_admins', type_='foreignkey')
        batch_op.drop_constraint('ck_listings_review_status', type_='check')
        batch_op.drop_column('submitted_at')
        batch_op.drop_column('reviewed_at')
        batch_op.drop_column('reviewed_by')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('review_status')

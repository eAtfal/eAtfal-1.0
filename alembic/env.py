import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool

from alembic import context

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import Base and config
from app.core.config import settings

# Import all models through base_all_models to ensure they are registered
from app.db.base_all_models import Base
from app.models.user import User  # noqa
from app.models.course import Course  # noqa
from app.models.lesson import Lesson  # noqa
from app.models.enrollment import Enrollment  # noqa
from app.models.lesson_completion import LessonCompletion  # noqa
from app.models.review import Review  # noqa

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata
target_metadata = Base.metadata

def get_url():
    """Get the URL for migrations, ensuring it's in sync format."""
    url = settings.sync_database_url
    if url.startswith('sqlite'):
        # Ensure SQLite URLs are properly formatted for sync operations
        return url.replace('sqlite+aiosqlite:///', 'sqlite:///')

def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # Compare type and nullable status
            compare_type=True,
            compare_server_default=True,
            # SQLite-specific configuration
            render_as_batch=True
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
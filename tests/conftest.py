import asyncio
import pytest
from httpx import AsyncClient

from app.main import app
from app.db.base import async_session

# pytest-asyncio is installed and `pytest.ini` sets asyncio_mode = auto


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_db():
    """Provide a transactional test DB session using the project's async_session."""
    async with async_session() as session:
        yield session


@pytest.fixture
async def client(test_db):
    """Create an AsyncClient for testing FastAPI app and attach the test DB session on app.state

    Tests rely on `client.app.state._test_db_session` in some places, so we attach it here.
    """
    # attach test DB session to app state for tests that need direct DB access via client
    app.state._test_db_session = test_db
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac

import pytest

import app as app_module


@pytest.fixture
def client():
    previous_puzzle = app_module.CURRENT["puzzle"]
    previous_solution = app_module.CURRENT["solution"]
    previous_game_id = app_module.CURRENT["game_id"]
    app_module.app.config.update(TESTING=True)
    app_module.CURRENT.update(puzzle=None, solution=None, game_id=None)

    try:
        with app_module.app.test_client() as test_client:
            yield test_client
    finally:
        app_module.CURRENT.update(
            puzzle=previous_puzzle,
            solution=previous_solution,
            game_id=previous_game_id,
        )

import pytest

import sudoku_logic


def test_index_route_renders_game_page(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Sudoku Game" in response.data


def test_new_route_returns_requested_puzzle(client):
    response = client.get("/new?clues=40")

    assert response.status_code == 200
    puzzle = response.get_json()["puzzle"]
    assert len(puzzle) == 9
    assert all(len(row) == 9 for row in puzzle)
    assert sum(value != 0 for row in puzzle for value in row) == 40
    assert sudoku_logic.count_solutions(puzzle, limit=2) == 1


@pytest.mark.parametrize(
    ("difficulty", "expected_clues"),
    [("easy", 42), ("medium", 34), ("hard", 26)],
)
def test_new_route_generates_requested_difficulty(client, difficulty, expected_clues):
    response = client.get(f"/new?difficulty={difficulty}")

    assert response.status_code == 200
    data = response.get_json()
    assert data["difficulty"] == difficulty
    assert sum(value != 0 for row in data["puzzle"] for value in row) == expected_clues
    assert sudoku_logic.count_solutions(data["puzzle"], limit=2) == 1


def test_new_route_defaults_to_medium_difficulty(client):
    response = client.get("/new")

    assert response.status_code == 200
    data = response.get_json()
    assert data["difficulty"] == "medium"
    assert sum(value != 0 for row in data["puzzle"] for value in row) == 34


def test_new_route_rejects_invalid_difficulty(client):
    response = client.get("/new?difficulty=impossible")

    assert response.status_code == 400
    assert response.get_json() == {"error": "Difficulty must be easy, medium, or hard"}


def test_check_route_reports_no_game_in_progress(client):
    response = client.post("/check", json={"board": [[0] * 9 for _ in range(9)]})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No game in progress"}


def test_check_route_reports_cells_different_from_solution(client):
    new_game = client.get("/new?clues=81")
    solved_board = new_game.get_json()["puzzle"]

    correct_response = client.post("/check", json={"board": solved_board})
    assert correct_response.status_code == 200
    assert correct_response.get_json() == {"incorrect": []}

    incorrect_board = [row[:] for row in solved_board]
    incorrect_board[0][0] = incorrect_board[0][0] % 9 + 1
    incorrect_response = client.post("/check", json={"board": incorrect_board})
    assert incorrect_response.status_code == 200
    assert incorrect_response.get_json() == {"incorrect": [[0, 0]]}

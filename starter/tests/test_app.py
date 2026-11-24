import pytest

import app as app_module
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


def test_hint_route_returns_empty_cell_and_correct_solution_digit(client):
    new_game = client.get("/new?clues=80")
    data = new_game.get_json()
    empty_cell = next(
        (row, col)
        for row in range(9)
        for col in range(9)
        if data["puzzle"][row][col] == 0
    )

    response = client.post(
        "/hint",
        json={"board": data["puzzle"], "game_id": data["game_id"]},
    )

    assert response.status_code == 200
    hint = response.get_json()
    row, col = hint["row"], hint["col"]
    assert (row, col) == empty_cell
    assert hint["value"] == app_module.CURRENT["solution"][row][col]


def test_hint_route_allows_more_than_five_hints_and_only_uses_empty_cells(client):
    new_game = client.get("/new?clues=69")
    data = new_game.get_json()
    board = [row[:] for row in data["puzzle"]]
    original_empty_cells = {
        (row, col)
        for row in range(9)
        for col in range(9)
        if board[row][col] == 0
    }
    hinted_cells = set()

    for _ in range(6):
        response = client.post(
            "/hint",
            json={"board": board, "game_id": data["game_id"]},
        )

        assert response.status_code == 200
        hint = response.get_json()
        cell = (hint["row"], hint["col"])
        assert cell in original_empty_cells
        assert cell not in hinted_cells
        assert hint["value"] == app_module.CURRENT["solution"][cell[0]][cell[1]]
        board[cell[0]][cell[1]] = hint["value"]
        hinted_cells.add(cell)


def test_hint_route_ignores_blank_prefilled_cells(client):
    new_game = client.get("/new?clues=80")
    data = new_game.get_json()
    board = [row[:] for row in data["puzzle"]]
    prefilled_cell = next(
        (row, col)
        for row in range(9)
        for col in range(9)
        if board[row][col] != 0
    )
    board[prefilled_cell[0]][prefilled_cell[1]] = 0

    response = client.post(
        "/hint",
        json={"board": board, "game_id": data["game_id"]},
    )

    assert response.status_code == 200
    hint = response.get_json()
    assert (hint["row"], hint["col"]) != prefilled_cell
    assert data["puzzle"][hint["row"]][hint["col"]] == 0


def test_hint_route_reports_no_empty_cells(client):
    new_game = client.get("/new?clues=81")
    data = new_game.get_json()

    response = client.post(
        "/hint",
        json={"board": data["puzzle"], "game_id": data["game_id"]},
    )

    assert response.status_code == 409
    assert response.get_json() == {"message": "No empty cells remain"}

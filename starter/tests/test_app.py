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

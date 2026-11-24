import sudoku_logic


def _is_complete_valid_board(board):
    expected = set(range(1, sudoku_logic.SIZE + 1))
    rows_valid = all(set(row) == expected for row in board)
    columns_valid = all(
        {board[row][column] for row in range(sudoku_logic.SIZE)} == expected
        for column in range(sudoku_logic.SIZE)
    )
    boxes_valid = all(
        {
            board[row][column]
            for row in range(box_row, box_row + 3)
            for column in range(box_column, box_column + 3)
        } == expected
        for box_row in range(0, sudoku_logic.SIZE, 3)
        for box_column in range(0, sudoku_logic.SIZE, 3)
    )
    return rows_valid and columns_valid and boxes_valid


def test_create_empty_board_returns_independent_nine_by_nine_grid():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 1

    assert len(board) == 9
    assert all(len(row) == 9 for row in board)
    assert board[0][1] == sudoku_logic.EMPTY
    assert board[1][0] == sudoku_logic.EMPTY


def test_generate_puzzle_preserves_solution_and_requested_clue_count():
    puzzle, solution = sudoku_logic.generate_puzzle(clues=40)

    assert _is_complete_valid_board(solution)
    assert sum(value != sudoku_logic.EMPTY for row in puzzle for value in row) == 40
    assert all(
        puzzle[row][column] in (sudoku_logic.EMPTY, solution[row][column])
        for row in range(sudoku_logic.SIZE)
        for column in range(sudoku_logic.SIZE)
    )


def test_is_safe_rejects_row_column_and_box_conflicts():
    board = sudoku_logic.create_empty_board()
    board[0][0] = 5

    assert not sudoku_logic.is_safe(board, 0, 1, 5)
    assert not sudoku_logic.is_safe(board, 1, 0, 5)
    assert not sudoku_logic.is_safe(board, 1, 1, 5)
    assert sudoku_logic.is_safe(board, 0, 1, 4)


def test_fill_board_solves_puzzle_and_preserves_given_values():
    board = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]
    given_values = {
        (row, column): value
        for row, values in enumerate(board)
        for column, value in enumerate(values)
        if value != sudoku_logic.EMPTY
    }

    assert sudoku_logic.fill_board(board)
    assert _is_complete_valid_board(board)
    assert all(board[row][column] == value for (row, column), value in given_values.items())

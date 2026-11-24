import copy
import random

SIZE = 9
EMPTY = 0
DIFFICULTY_CLUES = {
    "easy": 42,
    "medium": 34,
    "hard": 26,
}

def deep_copy(board):
    return copy.deepcopy(board)

def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]

def is_safe(board, row, col, num):
    # Check row and column
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True

def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    if limit <= 0:
        return 0

    row_values = [set() for _ in range(SIZE)]
    column_values = [set() for _ in range(SIZE)]
    box_values = [set() for _ in range(SIZE)]
    empty_cells = []

    for row in range(SIZE):
        for col in range(SIZE):
            value = board[row][col]
            if value == EMPTY:
                empty_cells.append((row, col))
                continue
            if not 1 <= value <= SIZE:
                return 0
            box = (row // 3) * 3 + col // 3
            if (
                value in row_values[row]
                or value in column_values[col]
                or value in box_values[box]
            ):
                return 0
            row_values[row].add(value)
            column_values[col].add(value)
            box_values[box].add(value)

    solutions = 0

    def search():
        nonlocal solutions
        if solutions >= limit:
            return
        if not empty_cells:
            solutions += 1
            return

        best_index = -1
        best_candidates = None
        for index, (row, col) in enumerate(empty_cells):
            box = (row // 3) * 3 + col // 3
            candidates = [
                value
                for value in range(1, SIZE + 1)
                if value not in row_values[row]
                and value not in column_values[col]
                and value not in box_values[box]
            ]
            if not candidates:
                return
            if best_candidates is None or len(candidates) < len(best_candidates):
                best_index = index
                best_candidates = candidates
                if len(candidates) == 1:
                    break

        row, col = empty_cells.pop(best_index)
        box = (row // 3) * 3 + col // 3
        for value in best_candidates:
            board[row][col] = value
            row_values[row].add(value)
            column_values[col].add(value)
            box_values[box].add(value)
            search()
            board[row][col] = EMPTY
            row_values[row].remove(value)
            column_values[col].remove(value)
            box_values[box].remove(value)
            if solutions >= limit:
                break
        empty_cells.insert(best_index, (row, col))

    search()
    return solutions


def remove_cells(board, clues):
    positions = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(positions)
    remaining = sum(value != EMPTY for row in board for value in row)

    for row, col in positions:
        if remaining <= clues:
            break
        value = board[row][col]
        if value == EMPTY:
            continue
        board[row][col] = EMPTY
        if count_solutions(board, limit=2) == 1:
            remaining -= 1
        else:
            board[row][col] = value
    return remaining


def generate_puzzle(clues=None, difficulty="medium"):
    target_clues = DIFFICULTY_CLUES.get(difficulty)
    if clues is None:
        if target_clues is None:
            raise ValueError(f"Unknown difficulty: {difficulty}")
        clues = target_clues
    if not isinstance(clues, int) or not 1 <= clues <= SIZE * SIZE:
        raise ValueError("Clue count must be between 1 and 81")

    while True:
        solution = create_empty_board()
        fill_board(solution)
        puzzle = deep_copy(solution)
        if remove_cells(puzzle, clues) == clues:
            return puzzle, solution

from flask import Flask, render_template, jsonify, request
import random
import uuid
import sudoku_logic

app = Flask(__name__)

# Keep a simple in-memory store for current puzzle and solution
CURRENT = {
    'puzzle': None,
    'solution': None,
    'game_id': None,
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/new')
def new_game():
    difficulty = request.args.get('difficulty', 'medium')
    if difficulty not in sudoku_logic.DIFFICULTY_CLUES:
        return jsonify({'error': 'Difficulty must be easy, medium, or hard'}), 400

    requested_clues = request.args.get('clues')
    try:
        if requested_clues is None:
            puzzle, solution = sudoku_logic.generate_puzzle(difficulty=difficulty)
        else:
            puzzle, solution = sudoku_logic.generate_puzzle(
                clues=int(requested_clues),
                difficulty=difficulty,
            )
    except ValueError as error:
        return jsonify({'error': str(error)}), 400

    CURRENT['puzzle'] = puzzle
    CURRENT['solution'] = solution
    CURRENT['game_id'] = uuid.uuid4().hex
    return jsonify({
        'puzzle': puzzle,
        'difficulty': difficulty,
        'game_id': CURRENT['game_id'],
    })

@app.route('/hint', methods=['POST'])
def get_hint():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'A JSON request body is required'}), 400

    if CURRENT['solution'] is None:
        return jsonify({'error': 'No game in progress'}), 400
    if data.get('game_id') != CURRENT['game_id']:
        return jsonify({'error': 'This game is no longer active'}), 409

    board = data.get('board')
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(
            not isinstance(row, list)
            or len(row) != sudoku_logic.SIZE
            or any(
                not isinstance(value, int)
                or isinstance(value, bool)
                or not 0 <= value <= sudoku_logic.SIZE
                for value in row
            )
            for row in board
        )
    ):
        return jsonify({'error': 'Board must be a 9 by 9 grid of digits from 0 to 9'}), 400

    empty_cells = [
        (row, col)
        for row in range(sudoku_logic.SIZE)
        for col in range(sudoku_logic.SIZE)
        if board[row][col] == sudoku_logic.EMPTY
    ]
    if not empty_cells:
        return jsonify({'message': 'No empty cells remain'}), 409

    row, col = random.choice(empty_cells)
    return jsonify({
        'row': row,
        'col': col,
        'value': CURRENT['solution'][row][col],
    })

@app.route('/check', methods=['POST'])
def check_solution():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({'error': 'A JSON request body is required'}), 400
    solution = CURRENT.get('solution')
    if solution is None:
        return jsonify({'error': 'No game in progress'}), 400
    if data.get('game_id') is not None and data['game_id'] != CURRENT['game_id']:
        return jsonify({'error': 'This game is no longer active'}), 409
    board = data.get('board')
    if (
        not isinstance(board, list)
        or len(board) != sudoku_logic.SIZE
        or any(not isinstance(row, list) or len(row) != sudoku_logic.SIZE for row in board)
    ):
        return jsonify({'error': 'Board must be a 9 by 9 grid'}), 400
    incorrect = []
    for i in range(sudoku_logic.SIZE):
        for j in range(sudoku_logic.SIZE):
            if board[i][j] != solution[i][j]:
                incorrect.append([i, j])
    return jsonify({'incorrect': incorrect})

if __name__ == '__main__':
    app.run(debug=True)
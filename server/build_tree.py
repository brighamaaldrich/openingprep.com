import chess
import chess.pgn
import chess.engine
import requests
import io
import json
import os
import onnxruntime as ort
import numpy as np
from rq import get_current_job

PVAL = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9
}

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))

STOCKFISH_EXECUTABLE_PATH = "/usr/local/bin/stockfish"
ONNX_MODEL_PATH = os.path.join(SCRIPT_DIR, "chess_predictor_final.onnx")

def material(board):
    w_mat = sum(len(board.pieces(type, chess.WHITE)) * val for type, val in PVAL.items())
    b_mat = sum(len(board.pieces(type, chess.BLACK)) * val for type, val in PVAL.items())
    return (w_mat, b_mat)

def king_safety(board, color):
    ksq = board.king(color)
    opp = not color
    pawns = board.pieces(chess.PAWN, color)
    opp_pawns = board.pieces(chess.PAWN, opp)
    f, r = chess.square_file(ksq), chess.square_rank(ksq)
    files = [x for x in (f-1, f, f+1) if 0 <= x < 8]
    ranks = [r+1, r+2] if color == chess.WHITE else [r-1, r-2]
    ranks = [x for x in ranks if 0 <= x < 8]
    shield_mask = sum(chess.BB_FILES[ff] & chess.BB_RANKS[rr] for ff in files for rr in ranks)
    shield_pawns = pawns & chess.SquareSet(shield_mask)
    shield_score = min(len(shield_pawns), 3)
    kfile = chess.BB_FILES[f]
    if pawns & chess.SquareSet(kfile): file_score = 2
    elif opp_pawns & chess.SquareSet(kfile): file_score = 1
    else: file_score = 0
    zone = chess.BB_KING_ATTACKS[ksq] | (1 << ksq)
    attacks_by_opp = sum(board.is_attacked_by(opp, sq) for sq in chess.SquareSet(zone))
    zone_score = max(0, 3 - attacks_by_opp)
    return shield_score + file_score + zone_score

def doubled_pawns(board, color):
    pawns = board.pieces(chess.PAWN, color)
    return sum(bin(pawns & chess.BB_FILES[f]).count("1") - 1 
               for f in range(8) if pawns & chess.BB_FILES[f])

def isolated_pawns(board, color):
    pawns = board.pieces(chess.PAWN, color)
    count = 0
    for f in range(8):
        if pawns & chess.BB_FILES[f]:
            adj = ((chess.BB_FILES[f-1] if f > 0 else 0) |
                   (chess.BB_FILES[f+1] if f < 7 else 0))
            if not (pawns & adj): count += bin(pawns & chess.BB_FILES[f]).count("1")
    return count

def passed_pawns(board, color):
    pawns, opp_pawns = board.pieces(chess.PAWN, color), board.pieces(chess.PAWN, not color)
    count = 0
    for sq in pawns:
        f = chess.square_file(sq)
        adj_files = [f] + ([f-1] if f > 0 else []) + ([f+1] if f < 7 else [])
        if color == chess.WHITE:
            ahead = sum(chess.BB_FILES[a] & chess.BB_RANKS[r] for a in adj_files for r in range(chess.square_rank(sq)+1, 8))
        else:
            ahead = sum(chess.BB_FILES[a] & chess.BB_RANKS[r] for a in adj_files for r in range(chess.square_rank(sq)))
        if not (opp_pawns & ahead): count += 1
    return count

def mobility(board):
    return board.legal_moves.count()

class ChessNode:
    def __init__(self, fen, san, uci):
        self.fen = fen
        self.san = san
        self.uci = uci
        self.occ = []
        self.res = {'w_wins': 0, 'b_wins': 0, 'draws': 0}
        self.children = {}
    
    def add_instance(self, result, w_elo, b_elo, w_clock, b_clock, tc):
        if result == "1-0": self.add_w_win()
        elif result == "0-1": self.add_b_win()
        if result == "1/2-1/2": self.add_draw()
        self.occ.append({
            "w_elo": w_elo, "b_elo": b_elo,
            "w_clock": w_clock, "b_clock": b_clock,
            "tc": tc
        })
    
    def add_w_win(self): self.res["w_wins"] += 1
    
    def add_b_win(self): self.res["b_wins"] += 1
    
    def add_draw(self): self.res["draws"] += 1
    
    def add_child(self, child): self.children[child.san] = child
    
    def get_count(self):
        if self.san != 'root': return len(self.occ)
        return sum(len(child.occ) for child in self.children.values())

class SharedNode:
    def __init__(self, fen, san, uci):
        self.fen = fen
        self.san = san
        self.uci = uci
        self.p1_res = {"w_wins": 0, "b_wins": 0, "draws": 0}
        self.p2_res = {"w_wins": 0, "b_wins": 0, "draws": 0}
        self.p1_occ = []
        self.p2_occ = []
        self.children = {}
        self.features = {}
        self.rates = {'w': 1, 'b': 1}
        self.counts = {'p1': 0, 'p2': 0}
    
    def get_count(self, player):
        return self.counts[player]
    
    def add_child(self, p1_child, p2_child):
        if p1_child.san != p2_child.san: return
        child = SharedNode(p1_child.fen, p1_child.san, p1_child.uci)
        self.children[p1_child.san] = child
        child.p1_res, child.p2_res = p1_child.res, p2_child.res
        child.p1_occ, child.p2_occ = p1_child.occ, p2_child.occ
        child.counts['p1'] = p1_child.get_count()
        child.counts['p2'] = p2_child.get_count()
        return child

def build_intersected_tree(p1, p2, p1_filters, p2_filters, threshold, depth, token, update_progress):
    update_progress("Pulling Games for Player 1...")
    p1_games = get_game_stream(p1, p1_filters, token)
    update_progress("Pulling Games for Player 2...")
    p2_games = get_game_stream(p2, p2_filters, token)
    if not p1_games or not p2_games: return {"error": "Could not fetch games."}
    update_progress("Building Tree for Player 1...")
    p1_tree = get_tree_from_stream(p1_games, depth)
    update_progress("Building Tree for Player 2...")
    p2_tree = get_tree_from_stream(p2_games, depth)
    if not p1_tree or not p2_tree: return {"error": "Could not build tree."}
    update_progress("Intersecting Player Trees...")
    return intersect_trees(p1_tree, p2_tree, threshold)

def get_games(player, filters, token):
    headers = { 'Content-Type': 'application/x-chess-pgn' }
    if token: headers['Authorization'] = f'Bearer {token}'
    url = f"https://lichess.org/api/games/user/{player}"
    try:
        res = requests.get(url, params=filters, headers=headers)
        res.raise_for_status()
        pgn_text = res.text
    except requests.RequestException: return None
    pgn_blocks = pgn_text.strip().split('\n\n\n')
    games = []
    for block in pgn_blocks:
        game_text = block.replace('\n\n', '\n').strip()
        game_io = io.StringIO(game_text)
        game = chess.pgn.read_game(game_io)
        games.append(game)
    return games

def get_game_stream(player, filters, token):
    headers = { 'Content-Type': 'application/x-chess-pgn' }
    if token: headers['Authorization'] = f'Bearer {token}'
    try:
        res = requests.get(
            f"https://lichess.org/api/games/user/{player}",
            params=filters,
            headers=headers,
            stream=True,
            timeout=1800
        )
        res.raise_for_status()
        return res
    except requests.RequestException: return None

def pgn_generator(res):
    buffer = ""
    for chunk in res.iter_content(chunk_size=1024):
        buffer += chunk.decode('utf-8')
        while "\n\n\n" in buffer:
            pgn_string, buffer = buffer.split("\n\n\n", 1)
            if pgn_string.strip(): yield pgn_string.strip()

def get_tree_from_stream(stream, depth):
    start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    root = ChessNode(start_fen, 'root', 'root')
    for pgn in pgn_generator(stream):
        if not pgn: continue
        game = chess.pgn.read_game(io.StringIO(pgn))
        result = game.headers.get("Result")
        w_elo = game.headers.get(f"WhiteElo")
        b_elo = game.headers.get(f"BlackElo")
        tc = game.headers.get('TimeControl')
        base = tc.split('/')[-1].split(':')[0].split('+')[0]
        b_clock, w_clock = float(base), float(base)
        head = root
        for node in game.mainline():
            board = node.board()
            fen, san, uci, ply = board.fen(), node.san(), node.move.uci(), node.ply()
            if ply > depth: break
            if ply % 2: w_clock = node.clock()
            else: b_clock = node.clock()
            if san not in head.children: head.add_child(ChessNode(fen, san, uci))
            head.children[san].add_instance(result, w_elo, b_elo, w_clock, b_clock, tc)
            head = head.children[san]
    return root

def print_tree(tree, depth=0):
    if not tree: return
    indent = "|  " * depth
    l = 6+len(indent)
    try: print(f"{indent}└{tree.san:<6} | {round(tree.rates['w']*100, 2)}% | {round(tree.rates['b']*100, 2)}%")
    except: print(f"{indent}└{tree.san:<6} | {tree.get_count()}")
    for child in tree.children.values():
        print_tree(child, depth+1)

def get_tree(games, depth):
    start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    root = ChessNode(start_fen, 'root', 'root')
    for game in games:
        result = game.headers.get("Result")
        w_elo = game.headers.get(f"WhiteElo")
        b_elo = game.headers.get(f"BlackElo")
        tc = game.headers.get('TimeControl')
        base = tc.split('/')[-1].split(':')[0].split('+')[0]
        b_clock, w_clock = float(base), float(base)
        head = root
        for node in game.mainline():
            board = node.board()
            fen, san, uci, ply = board.fen(), node.san(), node.move.uci(), node.ply()
            if ply > depth: break
            if ply % 2: w_clock = node.clock()
            else: b_clock = node.clock()
            if san not in head.children: head.add_child(ChessNode(fen, san, uci))
            head.children[san].add_instance(result, w_elo, b_elo, w_clock, b_clock, tc)
            head = head.children[san]
    return root

def intersect_trees(p1_tree, p2_tree, threshold):
    start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    root = SharedNode(start_fen, 'root', 'root')
    root.counts['p1'], root.counts['p2'] = p1_tree.get_count(), p2_tree.get_count()
    def intersect_recursive(p1_node, p2_node, head=root, ply=0):
        for child1 in p1_node.children.values():
            san = child1.san
            child2 = p2_node.children.get(san, None)
            if child2:
                w_rate = child1.get_count() / head.get_count('p1')
                b_rate = child2.get_count() / head.get_count('p2')
                if (w_rate < threshold and ply % 2 == 0) or (b_rate < threshold and ply % 2 == 1):
                    continue;
                child = head.add_child(child1, child2)
                child.rates['w'], child.rates['b'] = w_rate, b_rate
                intersect_recursive(child1, child2, child, ply+1)
    intersect_recursive(p1_tree, p2_tree)
    return root

def add_static_features(tree, stockfish_path):
    engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
    def add_recursively(node):
        board = chess.Board(node.fen)
        dyn_info = engine.analyse(board, chess.engine.Limit(time=0.2))
        sta_info = engine.analyse(board, chess.engine.Limit(depth=0))
        node.features['engine_eval_cp'] = dyn_info['score'].white().score(mate_score=10000)
        node.features['static_eval_cp'] = sta_info['score'].white().score(mate_score=10000)
        node.features['ply_number'] = board.ply()
        node.features['turn'] = 'w' if board.turn == chess.WHITE else 'b'
        node.features['white_castle_kingside'] = bool(board.castling_rights & chess.BB_H1)
        node.features['white_castle_queenside'] = bool(board.castling_rights & chess.BB_A1)
        node.features['black_castle_kingside'] = bool(board.castling_rights & chess.BB_H8)
        node.features['black_castle_queenside'] = bool(board.castling_rights & chess.BB_A8)
        node.features['halfmove_clock'] = board.halfmove_clock
        node.features['white_material'], node.features['black_material'] = material(board)
        node.features['isolated_pawns_w'] = isolated_pawns(board, chess.WHITE);
        node.features['doubled_pawns_w'] = doubled_pawns(board, chess.WHITE);
        node.features['passed_pawns_w'] = passed_pawns(board, chess.WHITE);
        node.features['isolated_pawns_b'] = isolated_pawns(board, chess.BLACK);
        node.features['doubled_pawns_b'] = doubled_pawns(board, chess.BLACK);
        node.features['passed_pawns_b'] = passed_pawns(board, chess.BLACK);
        node.features['king_safety_w'] = king_safety(board, chess.WHITE);
        node.features['king_safety_b'] = king_safety(board, chess.BLACK);
        node.features['mobility'] = mobility(board);
        for child in node.children.values():
            add_recursively(child)
    add_recursively(tree)
    engine.quit()

def get_prediction(features_dict, onnx_session):
    feature_order = [
        'white_rating', 'black_rating', 'white_clock', 'black_clock', 'ply_number',
        'is_white_turn', 'engine_eval_cp', 'white_material', 'black_material',
        'rating_diff', 'material_diff', 'clock_diff', 'base_time_sec', 'increment_sec',
        'static_eval_cp', 'eval_discrepancy', 'mobility', 'isolated_pawns_w',
        'isolated_pawns_b', 'doubled_pawns_w', 'doubled_pawns_b', 'passed_pawns_w',
        'passed_pawns_b', 'king_safety_w', 'king_safety_b',
        'white_castle_kingside', 'white_castle_queenside', 'black_castle_kingside',
        'black_castle_queenside', 'halfmove_clock'
    ]
    input_array = [features_dict.get(feature, 0) for feature in feature_order]
    input_np = np.array(input_array, dtype=np.float32).reshape(1, -1)
    input_name = onnx_session.get_inputs()[0].name
    prediction = onnx_session.run(None, {input_name: input_np})
    probs = prediction[1][0]
    b_wins, w_wins, draws = probs
    return {"w_wins": float(w_wins), "draws": float(draws), "b_wins": float(b_wins)}

def get_player_prediction(f, occ, onnx_session):
    white_rates, draw_rates, black_rates = [], [], []
    f["material_diff"] = f["white_material"] - f["black_material"]
    f["eval_discrepancy"] = f["engine_eval_cp"] - f["static_eval_cp"]
    f["is_white_turn"] = f["turn"] == "w"
    for o in occ:
        simple_tc = o["tc"].split('/')[-1].split(':')[0].split('+')
        base = int(simple_tc[0])
        inc = int(simple_tc[-1]) if len(simple_tc) > 1 else 0
        f['base_time_sec'] = base
        f['increment_sec'] = inc
        f['white_rating'] = int(o['w_elo'])
        f['black_rating'] = int(o['b_elo'])
        f['white_clock'] = int(o['w_clock'])
        f['black_clock'] = int(o['b_clock'])
        f['clock_diff'] = int(o['w_clock']) - int(o['b_clock'])
        probs = get_prediction(f, onnx_session)
        white_rates.append(probs["w_wins"])
        draw_rates.append(probs["draws"])
        black_rates.append(probs["b_wins"])
    w_wins = sum(white_rates) / len(white_rates) if len(white_rates) else 0
    draws = sum(draw_rates) / len(draw_rates) if len(draw_rates) else 0
    b_wins = sum(black_rates) / len(black_rates) if len(black_rates) else 0
    return {"w_wins": w_wins, "draws": draws, "b_wins": b_wins}

def add_predictions(tree, onnx_session):
    node_data = {
        "fen": tree.fen, "san": tree.san, "uci": tree.uci,
        "eval": tree.features["engine_eval_cp"],
        "rates": tree.rates, "counts": tree.counts,
        "p1_res": tree.p1_res, "p2_res": tree.p2_res,
        "p1_exp": get_player_prediction(tree.features, tree.p1_occ, onnx_session),
        "p2_exp": get_player_prediction(tree.features, tree.p2_occ, onnx_session),
        "children": [add_predictions(child, onnx_session) for child in tree.children.values()]
    }
    return node_data

def get_final_json_tree(p1, p2, p1_filters, p2_filters, threshold, depth, token=None):
    job = get_current_job()
    def update_progress(message):
        job.meta['progress'] = message
        job.save_meta()
    onnx_session = ort.InferenceSession(ONNX_MODEL_PATH)
    tree = build_intersected_tree(p1, p2, p1_filters, p2_filters, threshold, depth, token, update_progress)
    update_progress("Analyzing Positions...")
    add_static_features(tree, STOCKFISH_EXECUTABLE_PATH)
    update_progress("Predicting Scores...")
    return add_predictions(tree, onnx_session)


if __name__ == '__main__':
    filters = {
        'p1': {
            'color': 'white', 'rated': True, 'clocks': True, 'max': 20000,
            'perfType': 'bullet,blitz,rapid,classical'
        },
        'p2': {
            'color': 'black', 'rated': True, 'clocks': True, 'max': 20000,
            'perfType': 'bullet,blitz,rapid,classical'
        },
    }
    
    player1 = "DrNykterstein"
    player2 = "EricRosen"

    # stream = get_game_stream(player1, filters['p1'], None)
    # tree = get_tree_from_stream(stream, 5)
    # print_tree(tree)


    json_tree = get_final_json_tree(player1, player2, filters["p1"], filters["p2"], 0.15, 20)
    with open('tree.json', 'w') as fp:
        json.dump(json_tree, fp)
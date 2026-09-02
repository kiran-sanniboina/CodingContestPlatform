import os

base_dir = r"C:\Users\kiran\OneDrive\Documents\CodingContestWeb\coding-contest-platform\judge-worker\problems"

def write_test(prob, test_num, inp, out):
    for prefix in [str(prob), f"q{prob}"]:
        pdir = os.path.join(base_dir, prefix)
        os.makedirs(pdir, exist_ok=True)
        with open(os.path.join(pdir, f"{test_num:03d}.in"), "w", encoding="utf-8") as f:
            f.write(inp.strip() + "\n")
        with open(os.path.join(pdir, f"{test_num:03d}.out"), "w", encoding="utf-8") as f:
            f.write(out.strip() + "\n")

# Problem 1: The Signal Cipher
# Rule: If len(S) is odd, output chars with odd count sorted; if len(S) is even, output chars with even count (>0) sorted. If none, EMPTY.
def solve_p1(s):
    from collections import Counter
    cnt = Counter(s)
    is_odd = len(s) % 2 == 1
    res = []
    for c in sorted(cnt.keys()):
        if is_odd and cnt[c] % 2 == 1:
            res.append(c)
        elif not is_odd and cnt[c] % 2 == 0 and cnt[c] > 0:
            res.append(c)
    return "".join(res) if res else "EMPTY"

p1_cases = [
    "beacon", "aabbcc", "signal", "abacaba", "a", "aa", "abcde", "aabbccddee",
    "thequickbrownfoxjumpsoverthelazydog", "radar", "level", "1234567890", "1122334455",
    "quantumfluctuations", "hyperspacecoordinate99"
]
for idx, s in enumerate(p1_cases, 1):
    write_test(1, idx, s, solve_p1(s))

# Problem 2: The Reactor Grid
# Min path sum in NxM grid from (0,0) to (N-1, M-1) moving Right or Down. -1 if blocked.
def solve_p2(lines):
    n, m = map(int, lines[0].split())
    grid = [list(map(int, lines[i+1].split())) for i in range(n)]
    if grid[0][0] == -1 or grid[n-1][m-1] == -1:
        return "-1"
    dp = [[float('inf')] * m for _ in range(n)]
    dp[0][0] = grid[0][0]
    for i in range(n):
        for j in range(m):
            if grid[i][j] == -1:
                continue
            if i > 0 and dp[i-1][j] != float('inf'):
                dp[i][j] = min(dp[i][j], dp[i-1][j] + grid[i][j])
            if j > 0 and dp[i][j-1] != float('inf'):
                dp[i][j] = min(dp[i][j], dp[i][j-1] + grid[i][j])
    return str(dp[n-1][m-1]) if dp[n-1][m-1] != float('inf') else "-1"

p2_cases = [
    ("3 3\n1 3 1\n1 5 1\n4 2 1", "3 3\n1 3 1\n1 5 1\n4 2 1"),
    ("2 2\n1 2\n1 1", "2 2\n1 2\n1 1"),
    ("3 3\n1 -1 1\n1 -1 1\n1 1 1", "3 3\n1 -1 1\n1 -1 1\n1 1 1"),
    ("3 3\n1 -1 1\n-1 -1 1\n1 1 1", "3 3\n1 -1 1\n-1 -1 1\n1 1 1"),
    ("1 1\n42", "1 1\n42"),
    ("1 4\n1 2 3 4", "1 4\n1 2 3 4"),
    ("4 1\n1\n2\n3\n4", "4 1\n1\n2\n3\n4"),
    ("4 4\n5 1 2 4\n1 8 3 1\n2 1 1 1\n9 4 2 1", "4 4\n5 1 2 4\n1 8 3 1\n2 1 1 1\n9 4 2 1"),
    ("3 3\n1 2 3\n4 5 6\n7 8 9", "3 3\n1 2 3\n4 5 6\n7 8 9"),
    ("4 4\n1 1 1 1\n1 -1 -1 1\n1 -1 -1 1\n1 1 1 1", "4 4\n1 1 1 1\n1 -1 -1 1\n1 -1 -1 1\n1 1 1 1")
]
for idx, (raw, _) in enumerate(p2_cases, 1):
    write_test(2, idx, raw, solve_p2(raw.splitlines()))

# Problem 3: Asteroid Orbit Sync (Interval Scheduling)
def solve_p3(lines):
    n = int(lines[0])
    intervals = []
    for i in range(n):
        s, e = map(int, lines[i+1].split())
        intervals.append((s, e))
    intervals.sort(key=lambda x: x[1])
    count = 0
    last_end = -1
    for s, e in intervals:
        if s >= last_end:
            count += 1
            last_end = e
    return str(count)

p3_cases = [
    "3\n1 3\n2 4\n3 5",
    "4\n1 2\n2 3\n3 4\n4 5",
    "3\n1 10\n2 5\n6 9",
    "1\n5 10",
    "5\n1 4\n2 3\n3 5\n4 6\n5 7",
    "4\n1 5\n2 6\n3 7\n4 8",
    "6\n1 2\n3 4\n5 6\n7 8\n9 10\n11 12",
    "5\n0 10\n1 3\n4 6\n7 9\n2 8",
    "4\n10 20\n12 15\n16 18\n19 25",
    "6\n1 3\n2 5\n4 7\n6 9\n8 11\n10 13"
]
for idx, raw in enumerate(p3_cases, 1):
    write_test(3, idx, raw, solve_p3(raw.splitlines()))

# Problem 4: The Quantum Nexus (Shortest Path Dijkstra 1 to N)
def solve_p4(lines):
    import heapq
    n, m = map(int, lines[0].split())
    adj = {i: [] for i in range(1, n + 1)}
    for i in range(m):
        u, v, w = map(int, lines[i+1].split())
        adj[u].append((v, w))
        adj[v].append((u, w))
    dist = {i: float('inf') for i in range(1, n + 1)}
    dist[1] = 0
    pq = [(0, 1)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                heapq.heappush(pq, (dist[v], v))
    return str(dist[n]) if dist[n] != float('inf') else "-1"

p4_cases = [
    "4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 5\n3 4 1",
    "3 2\n1 2 5\n2 3 5",
    "3 1\n1 2 5",
    "2 1\n1 2 10",
    "5 6\n1 2 2\n2 3 3\n3 5 1\n1 4 4\n4 5 3\n2 4 1",
    "4 3\n1 2 1\n2 3 1\n3 4 1",
    "4 4\n1 2 1\n2 3 1\n3 1 1\n3 4 10",
    "5 4\n1 2 2\n2 3 2\n3 4 2\n1 5 10",
    "6 7\n1 2 4\n1 3 2\n2 4 5\n3 4 8\n3 5 10\n4 6 6\n5 6 3",
    "3 0"
]
for idx, raw in enumerate(p4_cases, 1):
    write_test(4, idx, raw, solve_p4(raw.splitlines()))

# Problem 5: The Galactic Core Protocol (Lexicographically smallest topological sort or DEADLOCK)
def solve_p5(lines):
    import heapq
    n, m = map(int, lines[0].split())
    adj = {i: [] for i in range(1, n + 1)}
    in_degree = {i: 0 for i in range(1, n + 1)}
    for i in range(m):
        u, v = map(int, lines[i+1].split())
        adj[u].append(v)
        in_degree[v] += 1
    pq = []
    for i in range(1, n + 1):
        if in_degree[i] == 0:
            heapq.heappush(pq, i)
    order = []
    while pq:
        u = heapq.heappop(pq)
        order.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                heapq.heappush(pq, v)
    if len(order) == n:
        return " ".join(map(str, order))
    else:
        return "DEADLOCK"

p5_cases = [
    "4 3\n1 2\n2 3\n3 4",
    "3 3\n1 2\n2 3\n3 1",
    "4 3\n2 4\n1 3\n3 4",
    "5 4\n1 2\n1 3\n2 4\n3 5",
    "2 1\n2 1",
    "3 0",
    "4 4\n1 2\n2 3\n3 4\n4 2",
    "5 5\n1 2\n2 3\n3 4\n4 5\n1 5",
    "6 6\n1 3\n2 3\n3 4\n4 5\n4 6\n5 6",
    "3 2\n3 2\n2 1"
]
for idx, raw in enumerate(p5_cases, 1):
    write_test(5, idx, raw, solve_p5(raw.splitlines()))

print("Successfully generated all test cases for Problems 1-5!")


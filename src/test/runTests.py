import subprocess

subprocess.call(["python", "init.py"])
print("-"*100)

suites = []

for s in suites:
    subprocess.call(["node", "./"+s+".js"])
    print("\x1b[0m", "-"*100)

PYTHON ?= python3
PORT ?= 8000
.PHONY: all compile run clean
all: compile
compile:
	@$(PYTHON) -c "from pathlib import Path; files=['index.html','styles.css','app.js']; assert all(Path(p).exists() for p in files); print('Ready: no compilation needed (HTML/CSS/JavaScript).')"
run: compile
	@echo "Open http://localhost:$(PORT) in your browser (Ctrl+C to stop)."
	@$(PYTHON) -m http.server $(PORT) --bind 127.0.0.1
clean:
	@echo "Nothing to clean."

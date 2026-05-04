# ================================================
# Main Makefile for NES test ROMs (cc65/ca65)
# Place this at the root of your Node.js library
# ================================================

# ---------------- Configuration ----------------
TEST_ROMS_DIR := test-roms
EMU := nestopia                     # Change to fceux, nestopia, etc. if preferred
NES_LIB_DIR := ../nes-lib           # Common library for ROMs (if needed)

# Common include path for all ROMs (if needed)
COMMON_INCLUDE := -I ../../$(NES_LIB_DIR)

# ------------------------------------------------

# Find all subdirectories in test-roms/
ROM_DIRS := $(wildcard $(TEST_ROMS_DIR)/*/)

# For each ROM dir: if it has its own Makefile → use it, else use default build
.PHONY: all build clean run

all: build

build:
	@echo "=== Building all NES test ROMs ==="
	@for dir in $(ROM_DIRS); do \
		echo "→ Building $$dir"; \
		dirname=$$(basename "$$dir"); \
		if [ -f "$$dir/Makefile" ]; then \
			echo "   (using custom Makefile)"; \
			$(MAKE) -C "$$dir" --no-print-directory; \
		else \
			echo "   (using default rules)"; \
			$(MAKE) -C "$$dir" -f ../../Makefile.default \
				TARGET=$$dirname \
				INCLUDE="$(COMMON_INCLUDE)" \
				--no-print-directory; \
		fi; \
	done
	@echo "=== All ROMs built ==="

clean:
	@echo "=== Cleaning all NES test ROMs ==="
	@for dir in $(ROM_DIRS); do \
		echo "→ Cleaning $$dir"; \
		if [ -f "$$dir/Makefile" ]; then \
			$(MAKE) -C "$$dir" clean --no-print-directory; \
		else \
			$(MAKE) -C "$$dir" -f ../../Makefile.default clean --no-print-directory; \
		fi; \
	done

run: build
	@echo "Running last built ROM (change logic if needed)"
	@dirname=$$(basename "$(word 1,$(ROM_DIRS))"); \
	if [ -f "$(word 1,$(ROM_DIRS))$$dirname.nes" ]; then \
		$(EMU) "$(word 1,$(ROM_DIRS))$$dirname.nes"; \
	else \
		echo "No ROM found: $(word 1,$(ROM_DIRS))$$dirname.nes"; \
	fi

# Optional: build a specific ROM by name
build-%:
	@dir="$(TEST_ROMS_DIR)/$*"; \
	if [ -d "$$dir" ]; then \
		echo "Building specific ROM: $*"; \
		if [ -f "$$dir/Makefile" ]; then \
			$(MAKE) -C "$$dir"; \
		else \
			$(MAKE) -C "$$dir" -f ../../Makefile.default TARGET=$* INCLUDE="$(COMMON_INCLUDE)"; \
		fi; \
	else \
		echo "ROM folder $* not found!"; \
	fi